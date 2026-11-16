import { describe, expect, it } from "vitest";
import { contactLinks, effectiveContacts } from "./contacts";

describe("user-initiated external contact links", () => {
  it("creates phone/SMS schemes and WhatsApp international digits without message text", () => {
    expect(
      contactLinks({
        call_phone: "+254 700 000101",
        sms_phone: "+254700000102",
        whatsapp_phone: "+254700000103",
      }),
    ).toEqual({
      call: "tel:+254700000101",
      sms: "sms:+254700000102",
      whatsapp: "https://wa.me/254700000103",
    });
  });
  it("does not turn unconfigured, local-only or malicious values into links", () => {
    expect(
      contactLinks({
        call_phone: "0712345678",
        sms_phone: "javascript:alert(1)",
        whatsapp_phone: "+254700000001?text=private",
      }),
    ).toEqual({ call: "", sms: "", whatsapp: "" });
    expect(contactLinks({})).toEqual({ call: "", sms: "", whatsapp: "" });
  });
  it("uses building overrides per channel without suppressing configured company defaults", () => {
    expect(
      effectiveContacts(
        { call_phone: "", whatsapp_phone: "+254700000104" },
        {
          call_phone: "+254700000101",
          sms_phone: "+254700000102",
          whatsapp_phone: "+254700000103",
        },
      ),
    ).toEqual({
      call_phone: "+254700000101",
      sms_phone: "+254700000102",
      whatsapp_phone: "+254700000104",
    });
  });
});
