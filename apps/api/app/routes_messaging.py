from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import Context, authenticated, property_ids, provider_links
from .db import get_db, serialize_writes

router = APIRouter(prefix="/api/v1", tags=["conversations"])


def membership(db: Session, user_id: str, org_id: str):
    return db.scalar(
        select(m.Membership).where(
            m.Membership.user_id == user_id,
            m.Membership.org_id == org_id,
            m.Membership.active.is_(True),
        )
    )


def contacts_for(db: Session, user: m.User, org_id: str) -> list[s.MessageContactOut]:
    member = membership(db, user.id, org_id)
    org = db.get(m.Organization, org_id)
    links = [link for link in provider_links(db, user.id) if link.org_id == org_id]
    if not org or (not member and not links):
        raise HTTPException(403, "No messaging access to this organization")
    contacts = {}
    staff = list(
        db.execute(
            select(m.Membership, m.User)
            .join(m.User)
            .where(
                m.Membership.org_id == org_id,
                m.Membership.active.is_(True),
                m.User.active.is_(True),
                m.Membership.role != "tenant",
            )
        )
    )
    assignments = {}
    for person, _ in staff:
        assignments[person.id] = set(
            db.scalars(
                select(m.Assignment.property_id).where(m.Assignment.membership_id == person.id)
            )
        )

    def add(target: m.User, role: str, prop: m.Property, lease=None, job=None):
        if target.id == user.id or not target.active:
            return
        if role == "tenant":
            target_member = membership(db, target.id, org_id)
            if not target_member or target_member.role != "tenant":
                return
        suffix = f" / Unit {db.get(m.Unit, lease.unit_id).number}" if lease else ""
        if job:
            suffix = f" / {job.title}"
        entry = s.MessageContactOut(
            user_id=target.id,
            name=target.name,
            role=role,
            property_id=prop.id,
            property_name=prop.name,
            tenancy_id=lease.id if lease else None,
            request_id=job.id if job else None,
            provider_id=job.provider_id if job else None,
            label=f"{target.name} ({role}) / {prop.name}{suffix}",
        )
        contacts[(target.id, prop.id, entry.tenancy_id, entry.request_id)] = entry

    def management(prop: m.Property, lease=None, job=None):
        for target_member, target in staff:
            if target_member.role == "owner" or (
                target_member.role == "manager" and prop.id in assignments[target_member.id]
            ):
                add(target, target_member.role, prop, lease, job)

    if member and member.role == "tenant":
        for lease in db.scalars(
            select(m.Tenancy)
            .join(m.Tenant)
            .where(m.Tenant.user_id == user.id, m.Tenant.org_id == org_id)
        ):
            prop = db.get(m.Property, db.get(m.Unit, lease.unit_id).property_id)
            management(prop, lease=lease)
    elif member:
        props = list(
            db.scalars(
                select(m.Property).where(
                    m.Property.id.in_(property_ids(db, Context(user, member, org)))
                )
            )
        )
        for prop in props:
            for target_member, target in staff:
                if target_member.role == "owner" or (
                    member.role == "owner" and prop.id in assignments[target_member.id]
                ):
                    add(target, target_member.role, prop)
            if member.role in ("owner", "manager"):
                for lease, tenant in db.execute(
                    select(m.Tenancy, m.Tenant)
                    .join(m.Tenant)
                    .join(m.Unit, m.Unit.id == m.Tenancy.unit_id)
                    .where(m.Unit.property_id == prop.id, m.Tenant.user_id.is_not(None))
                ):
                    add(db.get(m.User, tenant.user_id), "tenant", prop, lease=lease)
                for job, link in db.execute(
                    select(m.Maintenance, m.ProviderAccess)
                    .join(
                        m.ProviderAccess, m.ProviderAccess.provider_id == m.Maintenance.provider_id
                    )
                    .join(m.ServiceProvider, m.ServiceProvider.id == m.ProviderAccess.provider_id)
                    .where(
                        m.Maintenance.property_id == prop.id,
                        m.ProviderAccess.active.is_(True),
                        m.ServiceProvider.active.is_(True),
                    )
                ):
                    add(db.get(m.User, link.user_id), "service provider", prop, job=job)
    for job in db.scalars(
        select(m.Maintenance).where(
            m.Maintenance.org_id == org_id,
            m.Maintenance.provider_id.in_([link.provider_id for link in links]),
        )
    ):
        management(db.get(m.Property, job.property_id), job=job)
    return sorted(contacts.values(), key=lambda item: item.label)


@router.get("/messaging/contacts", response_model=list[s.MessageContactOut])
def contacts(org_id: str, auth=Depends(authenticated), db: Session = Depends(get_db)):
    return contacts_for(db, auth[0], org_id)


def matching_contact(contacts, recipient_id, property_id, tenancy_id, request_id, provider_id=None):
    return next(
        (
            entry
            for entry in contacts
            if (entry.user_id, entry.property_id, entry.tenancy_id, entry.request_id)
            == (recipient_id, property_id, tenancy_id, request_id)
            and (provider_id is None or entry.provider_id == provider_id)
        ),
        None,
    )


def conversation_access(db: Session, user: m.User, record: m.Conversation, write=False):
    member = membership(db, user.id, record.org_id)
    participant = user.id in (record.first_user_id, record.second_user_id)
    if not write and member and member.role == "owner":
        return
    other = record.second_user_id if user.id == record.first_user_id else record.first_user_id
    if not participant or not matching_contact(
        contacts_for(db, user, record.org_id),
        other,
        record.property_id,
        record.tenancy_id,
        record.request_id,
        record.provider_id,
    ):
        raise HTTPException(404, "Conversation not found")


def conversation_view(db: Session, record: m.Conversation, user: m.User):
    job = db.get(m.Maintenance, record.request_id) if record.request_id else None
    lease = db.get(m.Tenancy, record.tenancy_id) if record.tenancy_id else None
    label = (
        job.title
        if job
        else (f"Unit {db.get(m.Unit, lease.unit_id).number}" if lease else "Property conversation")
    )
    return dict(
        id=record.id,
        org_id=record.org_id,
        property_id=record.property_id,
        property_name=db.get(m.Property, record.property_id).name,
        participants=[
            db.get(m.User, record.first_user_id).name,
            db.get(m.User, record.second_user_id).name,
        ],
        tenancy_id=record.tenancy_id,
        request_id=record.request_id,
        provider_id=record.provider_id,
        context_label=label,
        observer=user.id not in (record.first_user_id, record.second_user_id),
        messages=[
            dict(
                id=message.id,
                sender_id=message.sender_id,
                sender=db.get(m.User, message.sender_id).name,
                body=message.body,
                created_at=message.created_at.isoformat(),
            )
            for message in db.scalars(
                select(m.ConversationMessage)
                .where(m.ConversationMessage.conversation_id == record.id)
                .order_by(m.ConversationMessage.created_at, m.ConversationMessage.id)
            )
        ],
    )


@router.get("/conversations", response_model=list[s.ConversationOut])
def conversations(
    org_id: str,
    request_id: str | None = None,
    auth=Depends(authenticated),
    db: Session = Depends(get_db),
):
    permitted = contacts_for(db, auth[0], org_id)
    member = membership(db, auth[0].id, org_id)
    owner = member and member.role == "owner"
    query = select(m.Conversation).where(m.Conversation.org_id == org_id)
    if not owner:
        query = query.where(
            or_(
                m.Conversation.first_user_id == auth[0].id,
                m.Conversation.second_user_id == auth[0].id,
            )
        )
    if request_id:
        query = query.where(m.Conversation.request_id == request_id)
    result = []
    for record in db.scalars(query.order_by(m.Conversation.created_at.desc())):
        other = (
            record.second_user_id if auth[0].id == record.first_user_id else record.first_user_id
        )
        if owner or matching_contact(
            permitted,
            other,
            record.property_id,
            record.tenancy_id,
            record.request_id,
            record.provider_id,
        ):
            result.append(conversation_view(db, record, auth[0]))
    return result


def save_message(db: Session, record: m.Conversation, user: m.User, body: str, key: str):
    old = db.scalar(
        select(m.ConversationMessage).where(
            m.ConversationMessage.sender_id == user.id, m.ConversationMessage.idempotency_key == key
        )
    )
    if old:
        if old.conversation_id != record.id or old.body != body:
            raise HTTPException(409, "Message retry key was used for a different message")
        return
    db.add(
        m.ConversationMessage(
            conversation_id=record.id, sender_id=user.id, body=body, idempotency_key=key
        )
    )
    other = record.second_user_id if user.id == record.first_user_id else record.first_user_id
    db.add(
        m.Notification(
            org_id=record.org_id,
            user_id=other,
            title="New conversation message",
            body="Open Messages to read the property conversation.",
        )
    )
    db.add(
        m.Audit(
            org_id=record.org_id,
            actor_id=user.id,
            action="conversation.message_sent",
            entity_id=record.id,
        )
    )
    db.flush()


@router.post("/conversations", response_model=s.ConversationOut, status_code=201)
def start_conversation(
    data: s.ConversationStart, auth=Depends(authenticated), db: Session = Depends(get_db)
):
    serialize_writes(db)
    db.scalar(select(m.User).where(m.User.id == auth[0].id).with_for_update())
    db.scalar(select(m.Organization).where(m.Organization.id == data.org_id).with_for_update())
    contact = matching_contact(
        contacts_for(db, auth[0], data.org_id),
        data.recipient_id,
        data.property_id,
        data.tenancy_id,
        data.request_id,
    )
    if not contact:
        raise HTTPException(
            403, "This recipient or property conversation is not available to your role"
        )
    first, second = sorted((auth[0].id, data.recipient_id))
    key = (
        f"job:{contact.request_id}:{contact.provider_id}"
        if contact.request_id
        else (f"tenancy:{contact.tenancy_id}" if contact.tenancy_id else "property")
    )
    record = db.scalar(
        select(m.Conversation).where(
            m.Conversation.org_id == data.org_id,
            m.Conversation.property_id == data.property_id,
            m.Conversation.first_user_id == first,
            m.Conversation.second_user_id == second,
            m.Conversation.context_key == key,
        )
    )
    if not record:
        record = m.Conversation(
            org_id=data.org_id,
            property_id=data.property_id,
            first_user_id=first,
            second_user_id=second,
            context_key=key,
            tenancy_id=contact.tenancy_id,
            request_id=contact.request_id,
            provider_id=contact.provider_id,
        )
        db.add(record)
        db.flush()
    save_message(db, record, auth[0], data.body, data.idempotency_key)
    result = conversation_view(db, record, auth[0])
    db.commit()
    return result


@router.get("/conversations/{conversation_id}", response_model=s.ConversationOut)
def transcript(conversation_id: str, auth=Depends(authenticated), db: Session = Depends(get_db)):
    record = db.get(m.Conversation, conversation_id)
    if not record:
        raise HTTPException(404, "Conversation not found")
    conversation_access(db, auth[0], record)
    return conversation_view(db, record, auth[0])


@router.post("/conversations/{conversation_id}/messages", response_model=s.ConversationOut)
def reply(
    conversation_id: str,
    data: s.ConversationReply,
    auth=Depends(authenticated),
    db: Session = Depends(get_db),
):
    serialize_writes(db)
    db.scalar(select(m.User).where(m.User.id == auth[0].id).with_for_update())
    record = db.get(m.Conversation, conversation_id)
    if not record:
        raise HTTPException(404, "Conversation not found")
    db.scalar(select(m.Organization).where(m.Organization.id == record.org_id).with_for_update())
    conversation_access(db, auth[0], record, write=True)
    save_message(db, record, auth[0], data.body, data.idempotency_key)
    result = conversation_view(db, record, auth[0])
    db.commit()
    return result
