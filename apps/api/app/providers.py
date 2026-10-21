"""Provider boundaries; intentionally no simulated banking or message delivery."""

from typing import Protocol


class PaymentProvider(Protocol):
    def sync(self, connection_id: str, cursor: str | None) -> dict: ...


class MessagingProvider(Protocol):
    def send(self, recipient: str, template: str, parameters: dict) -> str: ...


INTEGRATIONS = [
    {
        "name": "M-Pesa Daraja",
        "status": "not_configured",
        "reason": "Sandbox/production onboarding and callback validation required.",
    },
    {
        "name": "Bank feed",
        "status": "not_configured",
        "reason": "Verify the specific Kenyan bank and supported account/product.",
    },
    {
        "name": "WhatsApp Business",
        "status": "not_configured",
        "reason": "Business approval, consent and approved templates required.",
    },
    {
        "name": "Push notifications",
        "status": "not_configured",
        "reason": "Device registration, provider credentials and delivery worker required.",
    },
]
