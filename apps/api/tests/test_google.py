from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from pydantic import SecretStr
from sqlalchemy import select

from app import models as m
from app import routes_google
from app.auth import digest
from app.config import settings
from app.db import SessionLocal


@pytest.fixture
def google(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "synthetic-client")
    monkeypatch.setattr(settings, "google_client_secret", SecretStr("synthetic-secret"))

    def start(client, invitation=None, connect=False):
        response = client.post(
            "/api/v1/auth/google/" + ("link" if connect else "start"),
            json={"invitation": invitation},
        )
        assert response.status_code == 200, response.text
        query = parse_qs(urlparse(response.json()["url"]).query)
        assert query["code_challenge_method"] == ["S256"]
        monkeypatch.setattr(
            routes_google,
            "verified_claims",
            lambda *_: dict(
                sub="synthetic-subject",
                email="owner@example.com",
                email_verified=True,
                nonce=query["nonce"][0],
                iss="https://accounts.google.com",
            ),
        )
        return query["state"][0], query["nonce"][0]

    return start


def test_google_is_honestly_disabled_without_credentials(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    assert client.get("/api/v1/auth/google/status").json() == {"enabled": False}
    assert client.post("/api/v1/auth/google/start", json={}).status_code == 503


def test_google_requires_explicit_existing_account_link_and_single_use_browser_state(
    client, portfolio, google
):
    state, _ = google(client)
    denied = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "synthetic"},
        follow_redirects=False,
    )
    assert "auth_error" in denied.headers["location"]
    with SessionLocal() as db:
        assert db.scalar(select(m.GoogleIdentity)) is None
    state, _ = google(client, connect=True)
    missing_browser = client.cookies.get("jojobuilds_google")
    client.cookies.delete("jojobuilds_google")
    assert (
        "auth_error"
        in client.get(
            "/api/v1/auth/google/callback",
            params={"state": state, "code": "synthetic"},
            follow_redirects=False,
        ).headers["location"]
    )
    client.cookies.set("jojobuilds_google", missing_browser)
    result = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "synthetic"},
        follow_redirects=False,
    )
    assert "auth_error" not in result.headers["location"]
    with SessionLocal() as db:
        assert db.get(m.GoogleIdentity, "synthetic-subject") is not None
        assert db.get(m.OAuthAttempt, digest(state)) is None
    replay = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "synthetic"},
        follow_redirects=False,
    )
    assert "auth_error" in replay.headers["location"]


def test_google_creates_only_invited_matching_accounts(client, portfolio, google, monkeypatch):
    invitation = "synthetic-google-invitation-token"
    with SessionLocal.begin() as db:
        provider = m.ServiceProvider(
            org_id=portfolio["org"],
            name="Synthetic Google provider",
            trade="Plumbing",
            email="new-provider@example.com",
        )
        db.add(provider)
        db.flush()
        db.add(
            m.ActionToken(
                token_hash=digest(invitation),
                kind="provider_invite",
                email=provider.email,
                payload={"org_id": portfolio["org"], "provider_id": provider.id},
                expires_at=m.now() + timedelta(hours=1),
            )
        )
    state, nonce = google(client, invitation)
    monkeypatch.setattr(
        routes_google,
        "verified_claims",
        lambda *_: dict(
            sub="new-provider-subject",
            email="new-provider@example.com",
            email_verified=True,
            nonce=nonce,
            iss="https://accounts.google.com",
        ),
    )
    result = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "synthetic"},
        follow_redirects=False,
    )
    assert "auth_error" not in result.headers["location"]
    session = client.get("/api/v1/auth/session").json()
    assert session["email"] == "new-provider@example.com"
    assert session["provider_access"] and not session["organizations"]
    with SessionLocal() as db:
        assert db.get(m.ActionToken, digest(invitation)) is None


@pytest.mark.parametrize(
    "claim,value",
    [("nonce", "wrong"), ("email_verified", False), ("iss", "https://untrusted.invalid")],
)
def test_google_rejects_invalid_claims_without_linking(
    client, portfolio, google, monkeypatch, claim, value
):
    state, nonce = google(client, connect=True)
    claims = dict(
        sub="synthetic-subject",
        email="owner@example.com",
        email_verified=True,
        nonce=nonce,
        iss="https://accounts.google.com",
    )
    claims[claim] = value
    monkeypatch.setattr(routes_google, "verified_claims", lambda *_: claims)
    result = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "synthetic"},
        follow_redirects=False,
    )
    assert "auth_error" in result.headers["location"]
    with SessionLocal() as db:
        assert db.scalar(select(m.GoogleIdentity)) is None
