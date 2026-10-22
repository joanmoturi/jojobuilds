import type { components } from "./schema";

export type Session = components["schemas"]["SessionOut"];
export type Organization = components["schemas"]["OrganizationOut"];
export type Dashboard = components["schemas"]["DashboardOut"];
export type Property = components["schemas"]["PropertyOut"];
export type Unit = components["schemas"]["UnitOut"];
export type Tenant = components["schemas"]["TenantOut"];
export type Tenancy = components["schemas"]["TenancyOut"];
export type Rental = components["schemas"]["RentalOut"];
export type Charge = components["schemas"]["ChargeOut"];
export type Payment = components["schemas"]["PaymentOut"];
export type Reconciliation = components["schemas"]["ReconciliationOut"];
export type Maintenance = components["schemas"]["MaintenanceOut"];
export type Provider = components["schemas"]["ProviderOut"];
export type Payable = components["schemas"]["PayableOut"];
export type RecurringCharge = components["schemas"]["RecurringChargeOut"];
export type OwnerFinances = components["schemas"]["OwnerFinanceOut"];
export type PaymentInput = components["schemas"]["PaymentIn"];
export type Role = Organization["role"];

export interface Notice {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
export interface ImportBatch {
  id: string;
  filename: string;
  account: string;
  property_id: string;
  created_at: string;
  errors: { row: number; error: string }[];
}
export interface Attachment {
  id: string;
  name: string;
  tenancy_id: string | null;
  maintenance_id: string | null;
  property_id: string;
  size: number;
}
export interface Integration {
  name: string;
  status: string;
  reason: string;
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  property_ids: string[];
}
export interface AuditEvent {
  id: string;
  action: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}
export interface Preview {
  headers: string[];
  rows: {
    row_number: number;
    date: string;
    amount: number;
    description: string;
    reference: string;
  }[];
  sample: Record<string, unknown>[];
  errors: { row: number; error: string }[];
  total: number;
}
export interface Queries {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  tenancies: Tenancy[];
  rentals: Rental[];
  charges: Charge[];
  payments: Payment[];
  reconciliation: Reconciliation[];
  maintenance: Maintenance[];
  "maintenance-options": components["schemas"]["MaintenanceOptionOut"][];
  providers: Provider[];
  payables: Payable[];
  "recurring-charges": RecurringCharge[];
  notifications: Notice[];
  imports: ImportBatch[];
  attachments: Attachment[];
  integrations: Integration[];
  members: Member[];
  audit: AuditEvent[];
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export interface ApiConfig {
  baseUrl: string;
  credentials?: RequestCredentials;
  headers?: () => Record<string, string>;
  onUnauthorized?: () => void;
}

function messageFrom(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "The request could not be completed.";
  if ("detail" in payload) {
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail)) return "Check the required fields and their formats.";
    if (payload.detail && typeof payload.detail === "object" && "message" in payload.detail) {
      return String(payload.detail.message);
    }
  }
  return "The request could not be completed.";
}

export function createApi(config: ApiConfig) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        credentials: config.credentials ?? "include",
        headers: {
          ...config.headers?.(),
          ...(options.body && !(options.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
          ...options.headers,
        },
      });
      if (!response.ok) {
        if (response.status === 401) config.onUnauthorized?.();
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new ApiError(`Server returned ${response.status}. Please retry.`, response.status);
        }
        throw new ApiError(messageFrom(payload), response.status);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Request timed out. Check its status before retrying a payment.", 0);
      }
      throw new ApiError("Could not reach JOJOBUILDS. Check your connection and retry.", 0);
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    request,
    get<K extends keyof Queries>(resource: K, query = "") {
      return request<Queries[K]>(`/${resource}${query ? `?${query}` : ""}`);
    },
    dashboard(period: string) {
      return request<Dashboard>(`/dashboard?period=${encodeURIComponent(period)}`);
    },
    post<T = { id: string }>(path: string, body: unknown) {
      return request<T>(path, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
    },
  };
}

export function money(minor: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function parseMoney(value: string): number {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error("Enter a positive amount with up to two decimal places.");
  const [whole, cents = ""] = text.split(".");
  const result = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 1_000_000_000_000) {
    throw new Error("Amount must be positive and within the supported limit.");
  }
  return result;
}

export function parseOptionalMoney(value: string, fallback = 0): number {
  const text = value.trim();
  if (!text) return fallback;
  if (/^0+(\.0{1,2})?$/.test(text)) return 0;
  return parseMoney(text);
}

export const canFinance = (role: Role) => ["owner", "manager", "finance"].includes(role);
export const canManage = (role: Role) => ["owner", "manager"].includes(role);
export const canManageTenants = (role: Role) => ["owner", "manager", "agent"].includes(role);
export const canMaintain = (role: Role) =>
  ["owner", "manager", "caretaker", "maintenance"].includes(role);
