import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import (
    DUMMY_HASH,
    Context,
    audit,
    authenticated,
    context,
    digest,
    new_session,
    origin_check,
    passwords,
    rate_limit,
    require,
    revoke_sessions,
    scoped_property,
    session_view,
    utc,
)
from .config import settings
from .db import get_db

router = APIRouter(prefix="/api/v1", tags=["access"])


def login_user(data: s.Login, request: Request, db: Session):
    origin_check(request)
    rate_limit(db, request, "login")
    user = db.scalar(select(m.User).where(m.User.email == str(data.email).lower()))
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not user.active or not valid:
        raise HTTPException(401, "Email or password is incorrect")
    return user


@router.post("/auth/login", response_model=s.SessionOut)
def login(data: s.Login, request: Request, response: Response, db: Session = Depends(get_db)):
    user = login_user(data, request, db)
    session, _ = new_session(db, user, response)
    return session_view(db, user, session)


@router.post("/auth/mobile-login", response_model=s.SessionOut)
def mobile_login(
    data: s.Login, request: Request, response: Response, db: Session = Depends(get_db)
):
    user = login_user(data, request, db)
    session, token = new_session(db, user, response, mobile=True)
    return session_view(db, user, session, token)


@router.get("/auth/session", response_model=s.SessionOut)
def session(auth=Depends(authenticated), db: Session = Depends(get_db)):
    return session_view(db, *auth)


@router.post("/auth/logout")
def logout(response: Response, auth=Depends(authenticated), db: Session = Depends(get_db)):
    db.delete(auth[1])
    response.delete_cookie("jojobuilds_session", path="/")
    return {"ok": True}


@router.post("/auth/recover")
def recover(data: s.Recover, request: Request, db: Session = Depends(get_db)):
    origin_check(request)
    rate_limit(db, request, "recovery", maximum=5)
    email = str(data.email).lower()
    user = db.scalar(select(m.User).where(m.User.email == email, m.User.active.is_(True)))
    if user:
        token = secrets.token_urlsafe(40)
        db.add(
            m.ActionToken(
                token_hash=digest(token),
                kind="reset",
                email=email,
                expires_at=m.now() + timedelta(minutes=30),
            )
        )
        db.add(
            m.Mail(
                recipient=email,
                subject="Reset your JOJOBUILDS password",
                body=f"Open {settings.web_origin}/?reset={token}\nThis link expires in 30 minutes.",
            )
        )
    return {
        "message": "If the account exists, recovery instructions have been queued for delivery."
    }


@router.post("/auth/redeem")
def redeem(data: s.Redeem, request: Request, db: Session = Depends(get_db)):
    origin_check(request)
    rate_limit(db, request, "redeem", maximum=10)
    action = db.scalar(
        select(m.ActionToken)
        .where(m.ActionToken.token_hash == digest(data.token))
        .with_for_update()
    )
    if not action or utc(action.expires_at) < m.now():
        raise HTTPException(422, "This link is invalid or has expired")
    user = db.scalar(select(m.User).where(m.User.email == action.email))
    if action.kind == "reset":
        if not user:
            raise HTTPException(422, "This link is invalid or has expired")
        user.password_hash = passwords.hash(data.password)
        revoke_sessions(db, user.id)
    else:
        if user:
            # An invitation never resets an existing account's credentials.
            raise HTTPException(409, "Sign in to your existing account and accept this invitation")
        user = m.User(
            email=action.email, name=data.name, password_hash=passwords.hash(data.password)
        )
        db.add(user)
        db.flush()
        accept_membership(db, action, user)
    db.delete(action)
    return {"message": "Account updated. Sign in to continue."}


def accept_membership(db: Session, action: m.ActionToken, user: m.User):
    payload = action.payload
    existing = db.scalar(
        select(m.Membership).where(
            m.Membership.org_id == payload["org_id"], m.Membership.user_id == user.id
        )
    )
    if existing:
        raise HTTPException(409, "You already belong to this organization")
    tenant = None
    if payload["role"] == "tenant":
        tenant = db.scalar(
            select(m.Tenant)
            .where(m.Tenant.id == payload.get("tenant_id"), m.Tenant.org_id == payload["org_id"])
            .with_for_update()
        )
        if not tenant or tenant.email.lower() != user.email.lower():
            raise HTTPException(422, "This invitation no longer matches the tenant record")
        if tenant.user_id and tenant.user_id != user.id:
            raise HTTPException(409, "Tenant already has an account")
    member = m.Membership(org_id=payload["org_id"], user_id=user.id, role=payload["role"])
    db.add(member)
    db.flush()
    for prop in payload.get("property_ids", []) if payload["role"] != "tenant" else []:
        db.add(m.Assignment(membership_id=member.id, property_id=prop))
    if tenant:
        tenant.user_id = user.id
    db.add(
        m.Audit(
            org_id=payload["org_id"],
            actor_id=user.id,
            action="invitation.accepted",
            entity_id=member.id,
        )
    )


@router.post("/auth/accept-invitation")
def accept_invitation(
    data: s.Reason, request: Request, auth=Depends(authenticated), db: Session = Depends(get_db)
):
    token = db.scalar(
        select(m.ActionToken)
        .where(m.ActionToken.token_hash == digest(data.reason), m.ActionToken.kind == "invite")
        .with_for_update()
    )
    if not token or utc(token.expires_at) < m.now() or token.email != auth[0].email:
        raise HTTPException(422, "Invitation is invalid or belongs to a different account")
    accept_membership(db, token, auth[0])
    db.delete(token)
    return {"ok": True}


@router.post("/invitations")
def invite(data: s.Invite, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "invite")
    if data.role == "owner":
        raise HTTPException(422, "Ownership transfer is not supported")
    for prop in data.property_ids:
        scoped_property(db, ctx, prop)
    if data.role == "tenant":
        tenant = db.get(m.Tenant, data.tenant_id) if data.tenant_id else None
        if (
            not tenant
            or tenant.org_id != ctx.org.id
            or tenant.email.lower() != str(data.email).lower()
        ):
            raise HTTPException(422, "Select a tenant with the same email address")
        if tenant.user_id:
            raise HTTPException(409, "Tenant already has an account")
    token = secrets.token_urlsafe(40)
    db.add(
        m.ActionToken(
            token_hash=digest(token),
            kind="invite",
            email=str(data.email).lower(),
            payload={
                "org_id": ctx.org.id,
                "role": data.role,
                "property_ids": data.property_ids,
                "tenant_id": data.tenant_id,
            },
            expires_at=m.now() + timedelta(days=3),
        )
    )
    db.add(
        m.Mail(
            recipient=str(data.email).lower(),
            subject="Your JOJOBUILDS invitation",
            body=f"Open {settings.web_origin}/?invite={token}\nInvitation expires in 3 days.",
        )
    )
    audit(db, ctx, "invitation.created", ctx.org.id, role=data.role)
    return {"message": "Invitation queued. Delivery depends on the configured email worker."}


@router.get("/members")
def members(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "invite")
    rows = db.execute(
        select(m.Membership, m.User).join(m.User).where(m.Membership.org_id == ctx.org.id)
    ).all()
    return [
        {
            "id": member.id,
            "name": user.name,
            "email": user.email,
            "role": member.role,
            "active": member.active,
            "property_ids": list(
                db.scalars(
                    select(m.Assignment.property_id).where(m.Assignment.membership_id == member.id)
                )
            ),
        }
        for member, user in rows
    ]


@router.post("/members/{member_id}/deactivate")
def deactivate(member_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "invite")
    member = db.get(m.Membership, member_id)
    if not member or member.org_id != ctx.org.id:
        raise HTTPException(404, "Member not found")
    if member.role == "owner":
        raise HTTPException(422, "The organization owner cannot be deactivated here")
    member.active = False
    audit(db, ctx, "member.deactivated", member.id)
    return {"ok": True}


@router.get("/notifications")
def notifications(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    return db.scalars(
        select(m.Notification)
        .where(m.Notification.org_id == ctx.org.id, m.Notification.user_id == ctx.user.id)
        .order_by(m.Notification.created_at.desc())
        .limit(100)
    ).all()


@router.post("/notifications/{notification_id}/read")
def read_notification(
    notification_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    record = db.get(m.Notification, notification_id)
    if not record or record.user_id != ctx.user.id or record.org_id != ctx.org.id:
        raise HTTPException(404, "Notification not found")
    record.read = True
    return {"ok": True}
