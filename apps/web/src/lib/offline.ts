import type { Dashboard } from "@jojobuilds/api-client";

export const snapshotKey = "jojobuilds-offline-summary-v1";
export const snapshotLifetime = 24 * 60 * 60 * 1000;
export interface OfflineSummary {
  version: 1;
  savedAt: number;
  period: string;
  currency: string;
  demo: boolean;
  billed: number;
  allocated: number;
  outstanding: number;
  overdue: number;
  units: number;
  occupied: number;
}

export function makeSummary(data: Dashboard, now = Date.now()): OfflineSummary {
  return {
    version: 1,
    savedAt: now,
    period: data.period,
    currency: data.currency,
    demo: data.demo,
    billed: data.billed,
    allocated: data.allocated,
    outstanding: data.outstanding,
    overdue: data.overdue,
    units: data.units,
    occupied: data.occupied,
  };
}

export function parseSummary(value: unknown, now = Date.now()): OfflineSummary {
  if (!value || typeof value !== "object") throw new Error("Not a JOJOBUILDS summary.");
  const record = value as Record<string, unknown>;
  const numbers = ["billed", "allocated", "outstanding", "overdue", "units", "occupied"] as const;
  if (
    record.version !== 1 ||
    typeof record.savedAt !== "number" ||
    !Number.isSafeInteger(record.savedAt) ||
    record.savedAt > now ||
    now - record.savedAt >= snapshotLifetime ||
    typeof record.period !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(record.period) ||
    typeof record.currency !== "string" ||
    !/^[A-Z]{3}$/.test(record.currency) ||
    typeof record.demo !== "boolean" ||
    numbers.some((key) => !Number.isSafeInteger(record[key]) || (record[key] as number) < 0)
  ) {
    throw new Error("The summary is invalid or older than 24 hours. Save a fresh summary online.");
  }
  // Project allowed fields rather than retaining unexpected data from an imported file.
  return {
    version: 1,
    savedAt: record.savedAt,
    period: record.period,
    currency: record.currency,
    demo: record.demo,
    billed: record.billed as number,
    allocated: record.allocated as number,
    outstanding: record.outstanding as number,
    overdue: record.overdue as number,
    units: record.units as number,
    occupied: record.occupied as number,
  };
}

export function readSummary(): OfflineSummary | null {
  const saved = localStorage.getItem(snapshotKey);
  if (!saved) return null;
  try {
    return parseSummary(JSON.parse(saved));
  } catch {
    localStorage.removeItem(snapshotKey);
    return null;
  }
}

export function clearSummary() {
  try {
    localStorage.removeItem(snapshotKey);
    return true;
  } catch {
    return false;
  } finally {
    window.dispatchEvent(new Event("jojobuilds-summary-cleared"));
  }
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function decode(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}

async function backupKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, usage: KeyUsage[]) {
  if (passphrase.length < 12 || passphrase.length > 200)
    throw new Error("Use a passphrase of 12 to 200 characters.");
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

export async function encryptSummary(summary: OfflineSummary, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(passphrase, salt, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(parseSummary(summary))),
  );
  return JSON.stringify({
    product: "JOJOBUILDS-summary",
    version: 1,
    salt: encode(salt),
    iv: encode(iv),
    data: encode(new Uint8Array(ciphertext)),
  });
}

export async function decryptSummary(text: string, passphrase: string): Promise<OfflineSummary> {
  if (text.length > 20_000) throw new Error("Summary file is too large.");
  try {
    const file = JSON.parse(text);
    if (
      file.product !== "JOJOBUILDS-summary" ||
      file.version !== 1 ||
      typeof file.salt !== "string" ||
      typeof file.iv !== "string" ||
      typeof file.data !== "string"
    )
      throw new Error();
    const salt = decode(file.salt);
    const iv = decode(file.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const key = await backupKey(passphrase, salt, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, decode(file.data));
    return parseSummary(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    throw new Error(
      "Cannot restore: check the passphrase and use an unmodified summary less than 24 hours old.",
    );
  }
}
