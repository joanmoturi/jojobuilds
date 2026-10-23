import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { Queries, Role } from "@jojobuilds/api-client";
import Finance from "../src/app/finance";
import FinanceRecord from "../src/app/finance-record";

let mockRole: Role = "owner";
let mockParams: { section?: string; kind?: string; id?: string } = {};
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockBack = jest.fn();
const mockResource =
  jest.fn<(resource: keyof Queries, enabled?: boolean) => { data: unknown; error: null }>();
const mockQuery = jest.fn<(options: { enabled: boolean }) => { data: undefined; error: null }>();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  router: { back: () => mockBack(), push: jest.fn() },
}));
jest.mock("../src/auth", () => ({
  useAuth: () => ({
    org: {
      id: "org",
      name: "Synthetic",
      role: mockRole,
      currency: "KES",
      timezone: "Africa/Nairobi",
      demo: true,
    },
    api: { post: (...args: unknown[]) => mockPost(...args) },
  }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { enabled: boolean }) => mockQuery(options),
}));
jest.mock("../src/ui", () => ({
  ...jest.requireActual<typeof import("../src/ui")>("../src/ui"),
  useResource: (resource: keyof Queries, enabled?: boolean) => mockResource(resource, enabled),
  useRefresh: () => jest.fn(),
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Icon");

const resources: Partial<Queries> = {
  providers: [
    {
      id: "provider",
      name: "Example Plumber",
      portal_access: false,
      trade: "Plumbing",
      contact_name: "Example Contact",
      phone: "+254000000000",
      email: "",
      address: "",
      notes: "",
      active: true,
      billed: null,
      paid: null,
      balance: null,
      last_paid_on: null,
    },
  ],
  payables: [
    {
      id: "bill",
      kind: "service",
      provider_id: "provider",
      provider_name: "Example Plumber",
      property_id: "property",
      property_name: "Example Property",
      maintenance_id: null,
      description: "Example repair",
      reference: "",
      amount: 10000,
      paid: 4000,
      balance: 6000,
      issued_on: "2026-01-01",
      due_date: "2026-01-05",
      last_paid_on: null,
      overdue: true,
      voided_at: null,
      void_reason: null,
      payments: [],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = "owner";
  mockParams = {};
  mockPost.mockReset().mockResolvedValue({});
  mockResource.mockImplementation((resource) => ({ data: resources[resource] ?? [], error: null }));
  mockQuery.mockReturnValue({ data: undefined, error: null });
});

test("maintenance staff can read provider contacts without loading bill amounts", () => {
  mockRole = "maintenance";
  mockParams = { section: "providers" };
  const view = render(<Finance />);
  expect(view.getByText("Example Plumber")).toBeTruthy();
  expect(view.getByText(/Example Contact/)).toBeTruthy();
  expect(mockResource).toHaveBeenCalledWith("payables", false);
  expect(view.queryByRole("button", { name: "Add provider bill" })).toBeNull();
  expect(view.queryByText("Service bills & history")).toBeNull();
});

test("owner finances do not load for another role even through a direct route", () => {
  mockRole = "manager";
  mockParams = { section: "owner" };
  const view = render(<Finance />);
  expect(view.getByText("You do not have access to this page.")).toBeTruthy();
  expect(mockResource).toHaveBeenCalledWith("payables", false);
  expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
});

test("outgoing payment retries retain their key and submit exact minor units", async () => {
  mockParams = { kind: "outgoing-payment", id: "bill" };
  mockPost.mockRejectedValueOnce(new Error("Connection interrupted"));
  const view = render(<FinanceRecord />);
  fireEvent.changeText(view.getByLabelText("Amount actually paid (KES)"), "25.50");
  fireEvent.press(view.getByRole("button", { name: "Save record" }));
  await waitFor(() => expect(view.getByText("Connection interrupted")).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "Save record" }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockPost).toHaveBeenNthCalledWith(
    1,
    "/payables/bill/payments",
    expect.objectContaining({ amount: 2550, method: "bank", idempotency_key: expect.any(String) }),
  );
  expect(mockPost.mock.calls[1][1]).toEqual(mockPost.mock.calls[0][1]);
});
