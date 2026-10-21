import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from . import models as m
from .config import settings
from .db import get_db, serialize_writes
from .schemas import SessionOut

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("not-a-real-user-password")


def digest(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def utc(value: datetime):
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def rate_limit(db: Session, request: Request, category: str, maximum=15):
    host = request.client.host if request.client else "unknown"
    bucket = int(datetime.now(UTC).timestamp()) // 60
    key = digest(f"{host}:{category}:{bucket}")
    serialize_writes(db)
    record = db.get(m.RateBucket, key)
    if not record:
        record = m.RateBucket(key=key, count=0)
        db.add(record)
        db.flush()
    db.execute(
        update(m.RateBucket).where(m.RateBucket.key == key).values(count=m.RateBucket.count + 1)
    )
    db.commit()
    if record.count >= maximum:
        raise HTTPException(429, "Too many attempts. Wait a minute and retry.")


def origin_check(request: Request):
    if request.headers.get("origin") not in (None, settings.web_origin):
        raise HTTPException(403, "Untrusted request origin")


def new_session(db: Session, user: m.User, response: Response, mobile=False):
    token = secrets.token_urlsafe(40)
    session = m.AuthSession(
        token_hash=digest(token),
        user_id=user.id,
        csrf=secrets.token_urlsafe(32),
        mobile=mobile,
        expires_at=m.now() + timedelta(hours=settings.session_hours),
    )
    db.add(session)
    if not mobile:
        response.set_cookie(
            "jojobuilds_session",
            token,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="lax",
            max_age=settings.session_hours * 3600,
            path="/",
        )
    return session, token


def authenticated(request: Request, db: Session = Depends(get_db)):
    authorization = request.headers.get("authorization", "")
    mobile = authorization.startswith("Bearer ")
    token = authorization[7:] if mobile else request.cookies.get("jojobuilds_session")
    session = db.get(m.AuthSession, digest(token)) if token else None
    if not session or session.mobile != mobile or utc(session.expires_at) <= m.now():
        raise HTTPException(401, "Your session has expired. Please sign in.")
    user = db.get(m.User, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, "Account is unavailable")
    if not mobile and request.method not in ("GET", "HEAD", "OPTIONS"):
        origin_check(request)
        if not secrets.compare_digest(request.headers.get("x-csrf-token", ""), session.csrf):
            raise HTTPException(403, "Invalid CSRF token. Refresh and retry.")
    return user, session


@dataclass
class Context:
    user: m.User
    member: m.Membership
    org: m.Organization


def context(request: Request, auth=Depends(authenticated), db: Session = Depends(get_db)):
    user, _ = auth
    query = select(m.Membership).where(
        m.Membership.user_id == user.id, m.Membership.active.is_(True)
    )
    org_id = request.headers.get("x-organization")
    if org_id:
        query = query.where(m.Membership.org_id == org_id)
    member = db.scalars(query.order_by(m.Membership.id)).first()
    if not member:
        raise HTTPException(403, "No active membership in this organization")
    return Context(user, member, db.get(m.Organization, member.org_id))


def session_view(db: Session, user: m.User, session: m.AuthSession, token=None):
    memberships = db.execute(
        select(m.Membership, m.Organization)
        .join(m.Organization)
        .where(m.Membership.user_id == user.id, m.Membership.active.is_(True))
    ).all()
    return SessionOut(
        user_id=user.id,
        name=user.name,
        email=user.email,
        csrf=session.csrf,
        token=token,
        organizations=[
            dict(
                id=o.id,
                name=o.name,
                role=member.role,
                currency=o.currency,
                timezone=o.timezone,
                demo=o.demo,
            )
            for member, o in memberships
        ],
    )


PERMISSIONS = {
    "owner": {"manage", "finance", "maintain", "invite", "tenant_manage"},
    "manager": {"manage", "finance", "maintain", "tenant_manage"},
    "agent": {"tenant_manage"},
    "finance": {"finance"},
    "caretaker": {"maintain"},
    "maintenance": {"maintain"},
    "tenant": set(),
}


def require(ctx: Context, permission: str):
    if permission not in PERMISSIONS.get(ctx.member.role, set()):
        raise HTTPException(403, "You do not have permission for this action")


def property_ids(db: Session, ctx: Context):
    if ctx.member.role == "owner":
        return list(db.scalars(select(m.Property.id).where(m.Property.org_id == ctx.org.id)))
    if ctx.member.role == "tenant":
        return list(
            db.scalars(
                select(m.Unit.property_id)
                .join(m.Tenancy, m.Tenancy.unit_id == m.Unit.id)
                .join(m.Tenant, m.Tenant.id == m.Tenancy.tenant_id)
                .where(m.Tenant.user_id == ctx.user.id, m.Tenant.org_id == ctx.org.id)
            )
        )
    return list(
        db.scalars(
            select(m.Assignment.property_id).where(m.Assignment.membership_id == ctx.member.id)
        )
    )


def scoped_property(db: Session, ctx: Context, property_id: str):
    prop = db.get(m.Property, property_id)
    if not prop or prop.org_id != ctx.org.id or property_id not in property_ids(db, ctx):
        raise HTTPException(404, "Property not found")
    return prop


def scoped_tenancy(db: Session, ctx: Context, tenancy_id: str):
    tenancy = db.get(m.Tenancy, tenancy_id)
    if not tenancy or tenancy.org_id != ctx.org.id:
        raise HTTPException(404, "Tenancy not found")
    unit = db.get(m.Unit, tenancy.unit_id)
    scoped_property(db, ctx, unit.property_id)
    if ctx.member.role == "tenant":
        tenant = db.get(m.Tenant, tenancy.tenant_id)
        if tenant.user_id != ctx.user.id:
            raise HTTPException(404, "Tenancy not found")
    return tenancy


def audit(db: Session, ctx: Context, action: str, entity_id: str, **details):
    db.add(
        m.Audit(
            org_id=ctx.org.id,
            actor_id=ctx.user.id,
            action=action,
            entity_id=entity_id,
            details=details,
        )
    )


def notify(db: Session, ctx: Context, title: str, body: str, user_id=None):
    db.add(
        m.Notification(org_id=ctx.org.id, user_id=user_id or ctx.user.id, title=title, body=body)
    )


def revoke_sessions(db: Session, user_id: str):
    db.execute(delete(m.AuthSession).where(m.AuthSession.user_id == user_id))
