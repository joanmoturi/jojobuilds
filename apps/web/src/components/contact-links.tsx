import { MessageCircle, MessageSquare, Phone } from "lucide-react";
import { contactLinks, type ContactChannels } from "@/lib/contacts";

export function ContactLinks({
  channels,
  recipient,
}: {
  channels: ContactChannels;
  recipient: string;
}) {
  const links = contactLinks(channels);
  if (!links.call && !links.sms && !links.whatsapp) return null;
  return (
    <div className="contact-actions" role="group" aria-label={`Contact ${recipient}`}>
      {links.call && (
        <a className="button secondary" href={links.call} aria-label={`Call ${recipient}`}>
          <Phone size={16} aria-hidden="true" />
          Call
        </a>
      )}
      {links.sms && (
        <a className="button secondary" href={links.sms} aria-label={`Open SMS to ${recipient}`}>
          <MessageSquare size={16} aria-hidden="true" />
          SMS
        </a>
      )}
      {links.whatsapp && (
        <a
          className="button secondary"
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          aria-label={`Open WhatsApp chat with ${recipient} (external app)`}
        >
          <MessageCircle size={16} aria-hidden="true" />
          WhatsApp
        </a>
      )}
    </div>
  );
}
