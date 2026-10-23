"""Synthetic provider invitations and jobs for the isolated browser database."""

import os
from datetime import timedelta

from app import models as m
from app.auth import digest, passwords
from app.config import settings
from app.db import SessionLocal
from sqlalchemy import select

if settings.app_env != "test" or ".test-runs" not in settings.database_url:
    raise SystemExit("This fixture only runs in an isolated browser-test database")

with SessionLocal.begin() as db:
    owner = db.scalar(select(m.User).where(m.User.email == "owner@example.com"))
    first_org = db.scalar(
        select(m.Membership.org_id).where(m.Membership.user_id == owner.id)
    )
    prop = db.scalar(
        select(m.Property).where(
            m.Property.org_id == first_org, m.Property.name == "Kilimani Heights"
        )
    )
    lease = db.scalar(
        select(m.Tenancy)
        .join(m.Unit)
        .where(m.Unit.property_id == prop.id, m.Tenancy.status == "active")
    )
    other_owner = m.User(
        email="other-owner@example.com",
        name="Other synthetic owner",
        password_hash=passwords.hash(os.environ["JOJOBUILDS_BOOTSTRAP_PASSWORD"]),
    )
    second_org = m.Organization(name="Second synthetic landlord", demo=True)
    db.add_all([other_owner, second_org])
    db.flush()
    db.add(m.Membership(org_id=second_org.id, user_id=other_owner.id, role="owner"))
    other_property = m.Property(
        org_id=second_org.id,
        name="Synthetic workshop",
        location="Example location",
        contact="Synthetic manager",
    )
    db.add(other_property)
    db.flush()
    for index, (org_id, property_id, actor, tenancy_id) in enumerate(
        (
            (first_org, prop.id, owner.id, lease.id),
            (second_org.id, other_property.id, other_owner.id, None),
        ),
        start=1,
    ):
        provider = m.ServiceProvider(
            org_id=org_id,
            name="Synthetic portal plumber",
            trade="Plumbing",
            email="provider-login@example.com",
        )
        db.add(provider)
        db.flush()
        db.add(
            m.ActionToken(
                token_hash=digest(f"synthetic-e2e-provider-invitation-{index}"),
                kind="provider_invite",
                email=provider.email,
                payload={"org_id": org_id, "provider_id": provider.id},
                expires_at=m.now() + timedelta(hours=1),
            )
        )
        db.add(
            m.Maintenance(
                org_id=org_id,
                property_id=property_id,
                tenancy_id=tenancy_id,
                provider_id=provider.id,
                created_by=actor,
                title=f"Synthetic assigned repair {index}",
                description="Synthetic tap repair for browser testing",
                status="assigned",
                cost=9876500,
            )
        )
