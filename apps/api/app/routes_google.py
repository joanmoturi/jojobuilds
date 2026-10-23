import base64
import hashlib
import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, Response
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import authenticated, digest, new_session, origin_check, passwords, rate_limit, utc
from .config import settings
from .db import get_db, serialize_writes
from .routes_auth import accept_membership

router = APIRouter(prefix="/api/v1/auth/google", tags=["access"])
logger = logging.getLogger("jojobuilds")
COOKIE = "jojobuilds_google"


@router.get("/status")
def google_status():
    return {"enabled": bool(settings.google_client_id)}


def redirect_uri():
    return f"{settings.web_origin}/api/v1/auth/google/callback"


def start_attempt(
    data: s.GoogleStart, request: Request, response: Response, db: Session, user=None
):
    origin_check(request)
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not configured; use email and password")
    rate_limit(db, request, "google", maximum=10)
    state, browser, nonce, verifier = [secrets.token_urlsafe(40) for _ in range(4)]
    db.add(
        m.OAuthAttempt(
            state_hash=digest(state),
            browser_hash=digest(browser),
            nonce=nonce,
            verifier=verifier,
            invite_hash=digest(data.invitation) if data.invitation else None,
            link_user_id=user.id if user else None,
            expires_at=m.now() + timedelta(minutes=10),
        )
    )
    response.set_cookie(
        COOKIE,
        browser,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    )
    return {
        "url": "https://accounts.google.com/o/oauth2/v2/auth?"
        + urlencode(
            dict(
                client_id=settings.google_client_id,
                redirect_uri=redirect_uri(),
                response_type="code",
                scope="openid email profile",
                state=state,
                nonce=nonce,
                code_challenge=challenge,
                code_challenge_method="S256",
                prompt="select_account",
            )
        )
    }


@router.post("/start")
def start(data: s.GoogleStart, request: Request, response: Response, db: Session = Depends(get_db)):
    return start_attempt(data, request, response, db)


@router.post("/link")
def link(
    data: s.GoogleStart,
    request: Request,
    response: Response,
    auth=Depends(authenticated),
    db: Session = Depends(get_db),
):
    return start_attempt(data, request, response, db, auth[0])


def verified_claims(code, verifier):
    with httpx.Client(timeout=10) as client:
        token_response = client.post(
            "https://oauth2.googleapis.com/token",
            data=dict(
                code=code,
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret.get_secret_value(),
                redirect_uri=redirect_uri(),
                grant_type="authorization_code",
                code_verifier=verifier,
            ),
        )
        token_response.raise_for_status()
        token = token_response.json().get("id_token")
    if not isinstance(token, str):
        raise ValueError("Missing Google identity token")
    transport = GoogleRequest()

    def bounded_request(*args, **kwargs):
        kwargs["timeout"] = 10
        return transport(*args, **kwargs)

    return id_token.verify_oauth2_token(token, bounded_request, settings.google_client_id)


@router.get("/callback")
def callback(request: Request, state: str = "", code: str = "", db: Session = Depends(get_db)):
    failure = RedirectResponse(f"{settings.web_origin}/?auth_error=google_failed", status_code=303)
    failure.delete_cookie(COOKIE, path="/")
    serialize_writes(db)
    attempt = db.scalar(
        select(m.OAuthAttempt).where(m.OAuthAttempt.state_hash == digest(state)).with_for_update()
    )
    browser = request.cookies.get(COOKIE, "")
    if (
        not settings.google_client_id
        or not attempt
        or not browser
        or not secrets.compare_digest(attempt.browser_hash, digest(browser))
        or utc(attempt.expires_at) <= m.now()
    ):
        return failure
    # Consume the browser-bound attempt even when exchange or verification fails.
    db.delete(attempt)
    db.commit()
    if not code:
        return failure
    try:
        claims = verified_claims(code, attempt.verifier)
    except (httpx.HTTPError, GoogleAuthError, ValueError, TypeError):
        logger.warning("google_signin_verification_failed")
        return failure
    if (
        claims.get("nonce") != attempt.nonce
        or claims.get("email_verified") is not True
        or claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com")
        or not isinstance(claims.get("sub"), str)
        or not claims["sub"]
        or not isinstance(claims.get("email"), str)
    ):
        return failure
    email = claims["email"].lower()
    serialize_writes(db)
    identity = db.get(m.GoogleIdentity, claims["sub"])
    invitation = None
    if attempt.invite_hash:
        invitation = db.scalar(
            select(m.ActionToken)
            .where(
                m.ActionToken.token_hash == attempt.invite_hash,
                m.ActionToken.kind.in_(("invite", "provider_invite")),
            )
            .with_for_update()
        )
        if not invitation or utc(invitation.expires_at) <= m.now() or invitation.email != email:
            return failure
    if attempt.link_user_id:
        try:
            current, _ = authenticated(request, db)
        except HTTPException:
            return failure
        if current.id != attempt.link_user_id or current.email.lower() != email:
            return failure
        if identity and identity.user_id != current.id:
            return failure
        previous = db.scalar(select(m.GoogleIdentity).where(m.GoogleIdentity.user_id == current.id))
        if previous and previous.subject != claims["sub"]:
            return failure
        user = current
    elif identity:
        user = db.get(m.User, identity.user_id)
    else:
        existing = db.scalar(select(m.User).where(m.User.email == email))
        if existing or not invitation:
            # Existing password accounts must explicitly connect Google while signed in.
            return failure
        user = m.User(
            email=email,
            name=str(claims.get("name", email))[:120],
            password_hash=passwords.hash(secrets.token_urlsafe(60)),
        )
        db.add(user)
        db.flush()
    if not user or not user.active:
        return failure
    if invitation:
        try:
            accept_membership(db, invitation, user)
        except HTTPException:
            db.rollback()
            return failure
        db.delete(invitation)
    if not identity:
        db.add(m.GoogleIdentity(subject=claims["sub"], user_id=user.id))
    response = RedirectResponse(settings.web_origin + "/", status_code=303)
    response.delete_cookie(COOKIE, path="/")
    new_session(db, user, response)
    return response
