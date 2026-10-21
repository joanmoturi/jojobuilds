import argparse
import getpass
import json
import os
import re
import shutil
import smtplib
import sqlite3
from contextlib import closing
from datetime import date, timedelta
from email.message import EmailMessage
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy import select

from . import models as m
from .auth import Context, passwords
from .config import settings
from .db import SessionLocal, engine
from .ledger import bill_period, post_payment
from .schemas import PaymentIn


def requested_password():
    password = os.environ.get("JOJOBUILDS_BOOTSTRAP_PASSWORD") or getpass.getpass(
        "Choose a password (12+ characters): "
    )
    if len(password) < 12:
        raise SystemExit("Use at least 12 characters")
    return password


def bootstrap(email: str, name: str, demo=False):
    password = requested_password()
    with SessionLocal.begin() as db:
        if db.scalar(select(m.User.id).where(m.User.email == email.lower())):
            raise SystemExit("Account already exists. Use set-password to change its password.")
        user = m.User(email=email.lower(), name=name, password_hash=passwords.hash(password))
        org = m.Organization(
            name="JOJOBUILDS Demo Portfolio" if demo else "My JOJOBUILDS Portfolio", demo=demo
        )
        db.add_all([user, org])
        db.flush()
        member = m.Membership(user_id=user.id, org_id=org.id, role="owner")
        db.add(member)
        db.flush()
        if demo:
            seed_portfolio(db, Context(user, member, org))
    print("Account created. Sign in using your email and the password you chose.")


def seed_portfolio(db, ctx: Context):
    today = date.today()
    first = today.replace(day=1)
    places = [
        ("Kilimani Heights", "Argwings Kodhek Road, Kilimani", "Nairobi", 4500000),
        ("Westlands Ridge", "Rhapta Road, Westlands", "Nairobi", 6000000),
        ("Riverside Green Court", "Riverside Drive", "Nairobi", 3500000),
    ]
    names = [
        "Alex Demo",
        "Blair Example",
        "Casey Sample",
        "Drew Demo",
        "Eden Example",
        "Finley Sample",
        "Gray Demo",
        "Harper Example",
        "Indigo Sample",
    ]
    tenancies = []
    for pindex, (name, location, county, rent) in enumerate(places):
        prop = m.Property(
            org_id=ctx.org.id,
            name=name,
            location=location,
            county=county,
            contact="Demo property office — replace before real use",
        )
        db.add(prop)
        db.flush()
        for index in range(4):
            unit = m.Unit(
                org_id=ctx.org.id,
                property_id=prop.id,
                number=f"A{index + 1:02}",
                building="Main",
                default_rent=rent,
            )
            db.add(unit)
            db.flush()
            if index == 3:
                continue
            tenant = m.Tenant(
                org_id=ctx.org.id,
                name=names[pindex * 3 + index],
                email=f"tenant{pindex * 3 + index + 1}@example.com",
                phone="",
            )
            db.add(tenant)
            db.flush()
            tenancy = m.Tenancy(
                org_id=ctx.org.id,
                unit_id=unit.id,
                tenant_id=tenant.id,
                reference=f"JOJO-{pindex + 1}{index + 1}",
                rent=rent,
                deposit=rent,
                due_day=5,
                start_date=first - timedelta(days=60),
            )
            db.add(tenancy)
            db.flush()
            tenancies.append(tenancy)
    bill_period(db, ctx, today.strftime("%Y-%m"), tenancies)
    for index, tenancy in enumerate(tenancies):
        if index % 3 == 0:
            continue
        post_payment(
            db,
            ctx,
            PaymentIn(
                tenancy_id=tenancy.id,
                amount=tenancy.rent if index % 3 == 1 else tenancy.rent // 2,
                received_on=today,
                reference=f"DEMO-{index}",
                method="mpesa",
                idempotency_key=f"synthetic-seed-payment-{index}",
            ),
        )
    prop = db.scalar(select(m.Property).where(m.Property.org_id == ctx.org.id))
    db.add(
        m.Maintenance(
            org_id=ctx.org.id,
            property_id=prop.id,
            created_by=ctx.user.id,
            title="Demo: leaking kitchen tap",
            description="Synthetic request for exploring the workflow.",
            category="Plumbing",
            priority="normal",
        )
    )
    db.add(
        m.Notification(
            org_id=ctx.org.id,
            user_id=ctx.user.id,
            title="Welcome to JOJOBUILDS",
            body="This is synthetic demo data. Create a separate account/portfolio for real records.",
        )
    )


def send_mail():
    if not settings.smtp_host:
        raise SystemExit("SMTP is not configured. Messages remain queued; nothing was delivered.")
    with SessionLocal.begin() as db:
        messages = db.scalars(select(m.Mail).where(m.Mail.sent_at.is_(None)).limit(100)).all()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.app_env == "production":
                smtp.starttls()
            for mail in messages:
                message = EmailMessage()
                message["From"], message["To"], message["Subject"] = (
                    settings.smtp_from,
                    mail.recipient,
                    mail.subject,
                )
                message.set_content(mail.body)
                mail.attempts += 1
                smtp.send_message(message)
                mail.sent_at = m.now()
        print(f"Sent {len(messages)} queued messages")


def backup(destination: Path):
    if engine.dialect.name != "sqlite":
        raise SystemExit(
            "For PostgreSQL use pg_dump plus a storage snapshot; see BACKUP_AND_RESTORE.md"
        )
    if destination.exists():
        raise SystemExit("Backup destination already exists; choose a new filename")
    database_path = Path(engine.url.database).resolve()
    data_path = settings.data_dir.resolve()
    if destination.resolve().is_relative_to(data_path):
        raise SystemExit("Write backups outside DATA_DIR")
    snapshot = database_path.with_name("backup-snapshot-" + m.uid() + ".db")
    try:
        with (
            closing(sqlite3.connect(database_path)) as source,
            closing(sqlite3.connect(snapshot)) as target,
        ):
            source.backup(target)
        with ZipFile(destination, "x", ZIP_DEFLATED) as archive:
            archive.write(snapshot, "database.db")
            if data_path.exists():
                for kind in ("attachments", "imports"):
                    directory = data_path / kind
                    if directory.exists():
                        for file in directory.iterdir():
                            if file.is_file():
                                archive.write(file, f"files/{kind}/{file.name}")
            archive.writestr(
                "manifest.json",
                json.dumps({"product": "JOJOBUILDS", "created_at": m.now().isoformat()}),
            )
    finally:
        snapshot.unlink(missing_ok=True)
    print(f"Backup created: {destination}. Treat it as confidential.")


def restore(source: Path, output: Path):
    if output.exists():
        raise SystemExit("Restore requires a new directory; existing data is never overwritten")
    with ZipFile(source) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        if manifest.get("product") != "JOJOBUILDS":
            raise SystemExit("Not a JOJOBUILDS backup")
        if sum(item.file_size for item in archive.infolist()) > 2 * 1024**3:
            raise SystemExit("Archive exceeds the local restore limit of 2 GB")
        allowed = re.compile(r"^files/(attachments|imports)/[a-f0-9-]{36}\.(pdf|png|jpg|csv|xlsx)$")
        if any(
            name not in ("database.db", "manifest.json") and not allowed.fullmatch(name)
            for name in archive.namelist()
        ):
            raise SystemExit("Archive contains unexpected file paths")
        output.mkdir(parents=True)
        for name in archive.namelist():
            if name == "manifest.json":
                continue
            destination = output.joinpath(*name.split("/"))
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(name) as original, destination.open("xb") as target:
                shutil.copyfileobj(original, target)
    with closing(sqlite3.connect(output / "database.db")) as db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("Restored database failed integrity_check; do not use it")
    print(
        f"Restored into {output}. Stop the application before pointing DATABASE_URL and DATA_DIR here."
    )


def main():
    parser = argparse.ArgumentParser(description="JOJOBUILDS local administration")
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("bootstrap", "seed", "set-password"):
        sub = commands.add_parser(command)
        sub.add_argument("--email", required=True)
        if command != "set-password":
            sub.add_argument("--name", default="Portfolio Owner")
    commands.add_parser("send-mail")
    commands.add_parser("bill")
    commands.add_parser("export-openapi").add_argument("--output", required=True)
    commands.add_parser("backup").add_argument("--output", type=Path, required=True)
    restore_parser = commands.add_parser("restore")
    restore_parser.add_argument("--input", type=Path, required=True)
    restore_parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if args.command in ("bootstrap", "seed"):
        bootstrap(args.email, args.name, demo=args.command == "seed")
    elif args.command == "set-password":
        password = requested_password()
        with SessionLocal.begin() as db:
            user = db.scalar(select(m.User).where(m.User.email == args.email.lower()))
            if not user:
                raise SystemExit("Account not found")
            user.password_hash = passwords.hash(password)
            from .auth import revoke_sessions

            revoke_sessions(db, user.id)
        print("Password changed and all sessions revoked.")
    elif args.command == "send-mail":
        send_mail()
    elif args.command == "backup":
        backup(args.output)
    elif args.command == "restore":
        restore(args.input, args.output_dir)
    elif args.command == "export-openapi":
        from .main import app

        Path(args.output).write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
    elif args.command == "bill":
        with SessionLocal.begin() as db:
            for org in db.scalars(select(m.Organization)):
                owner = db.scalar(
                    select(m.Membership).where(
                        m.Membership.org_id == org.id, m.Membership.role == "owner"
                    )
                )
                if not owner or not owner.active:
                    continue
                ctx = Context(db.get(m.User, owner.user_id), owner, org)
                from .ledger import local_today

                tenancies = list(db.scalars(select(m.Tenancy).where(m.Tenancy.org_id == org.id)))
                result = bill_period(db, ctx, local_today(ctx).strftime("%Y-%m"), tenancies)
                print(f"Organization {org.id}: {result}")


if __name__ == "__main__":
    main()
