import { describe, expect, it } from "vitest";
import { decryptSummary, encryptSummary, parseSummary, snapshotLifetime } from "./offline";

const summary = () => ({
  version: 1 as const,
  savedAt: Date.now(),
  period: "2026-11",
  currency: "KES",
  demo: true,
  billed: 10000,
  allocated: 4000,
  outstanding: 6000,
  overdue: 0,
  units: 2,
  occupied: 1,
});

describe("optional offline summary", () => {
  it("rejects expired, future-dated and malformed totals", () => {
    const saved = summary();
    expect(() => parseSummary(saved, saved.savedAt + snapshotLifetime)).toThrow(
      "older than 24 hours",
    );
    expect(() => parseSummary(saved, saved.savedAt - 1)).toThrow();
    expect(() => parseSummary({ ...saved, billed: "10000" })).toThrow();
    expect(() => parseSummary({ ...saved, period: "2026-13" })).toThrow();
  });

  it("drops unexpected personal data rather than restoring it", () => {
    expect(
      parseSummary({
        ...summary(),
        email: "not-to-be-saved@example.test",
        csrf: "not-to-be-saved",
      }),
    ).not.toHaveProperty("email");
    expect(parseSummary({ ...summary(), csrf: "not-to-be-saved" })).not.toHaveProperty("csrf");
  });

  it("round-trips an encrypted backup and rejects a different passphrase", async () => {
    const saved = summary();
    const encrypted = await encryptSummary(saved, "synthetic-test-passphrase");
    expect(encrypted).not.toContain('"billed"');
    expect(await decryptSummary(encrypted, "synthetic-test-passphrase")).toEqual(saved);
    await expect(decryptSummary(encrypted, "different-test-passphrase")).rejects.toThrow(
      "Cannot restore",
    );
  });

  it("rejects modified or oversized backup files", async () => {
    const encrypted = JSON.parse(await encryptSummary(summary(), "synthetic-test-passphrase"));
    encrypted.data = encrypted.data.slice(0, -4) + "AAAA";
    await expect(
      decryptSummary(JSON.stringify(encrypted), "synthetic-test-passphrase"),
    ).rejects.toThrow();
    await expect(decryptSummary("x".repeat(20_001), "synthetic-test-passphrase")).rejects.toThrow(
      "too large",
    );
  });
});
