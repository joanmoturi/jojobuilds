export interface ContactChannels {
  call_phone?: string;
  sms_phone?: string;
  whatsapp_phone?: string;
}

export function contactLinks(channels: ContactChannels) {
  const phone = (value?: string) => {
    const number = value?.replace(/[ ()-]/g, "") ?? "";
    return /^\+[1-9][0-9]{6,14}$/.test(number) ? number : "";
  };
  const call = phone(channels.call_phone);
  const sms = phone(channels.sms_phone);
  const whatsapp = phone(channels.whatsapp_phone);
  return {
    call: call ? `tel:${call}` : "",
    sms: sms ? `sms:${sms}` : "",
    whatsapp: whatsapp ? `https://wa.me/${whatsapp.slice(1)}` : "",
  };
}

export function effectiveContacts(
  building: ContactChannels,
  company: ContactChannels,
): ContactChannels {
  return {
    call_phone: building.call_phone || company.call_phone,
    sms_phone: building.sms_phone || company.sms_phone,
    whatsapp_phone: building.whatsapp_phone || company.whatsapp_phone,
  };
}
