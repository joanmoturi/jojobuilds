import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { Conversation, MessageContact } from "@jojobuilds/api-client";
import { NativeMessaging } from "../src/messaging";

const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockInvalidate = jest.fn<() => Promise<void>>();
let mockConversations: Conversation[] = [];
const contact: MessageContact = {
  user_id: "tenant",
  name: "Synthetic tenant",
  role: "tenant",
  property_id: "property",
  property_name: "Synthetic property",
  tenancy_id: "tenancy",
  request_id: null,
  provider_id: null,
  label: "Synthetic tenant / Synthetic property",
};

jest.mock("../src/auth", () => ({
  useAuth: () => ({
    org: { id: "org", role: "manager" },
    api: { post: (...args: unknown[]) => mockPost(...args) },
  }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => ({
    data: options.queryKey[0] === "conversations" ? mockConversations : [contact],
    error: null,
    refetch: jest.fn(),
  }),
  useQueryClient: () => ({ invalidateQueries: () => mockInvalidate() }),
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Icon");

beforeEach(() => {
  jest.clearAllMocks();
  mockConversations = [];
  mockPost.mockReset();
  mockInvalidate.mockResolvedValue();
});

test("shared message retries preserve recipient scope and retry key", async () => {
  mockPost
    .mockRejectedValueOnce(new Error("Connection interrupted"))
    .mockResolvedValueOnce({ id: "thread" });
  const view = render(<NativeMessaging />);
  fireEvent.press(view.getByRole("button", { name: contact.label }));
  fireEvent.changeText(view.getByLabelText("Conversation message"), "Synthetic reply");
  fireEvent.press(view.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(view.getByText("Connection interrupted")).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(view.getByText("Message sent in-app.")).toBeTruthy());
  expect(mockPost.mock.calls[0]).toEqual(mockPost.mock.calls[1]);
  expect(mockPost).toHaveBeenCalledWith(
    "/conversations",
    expect.objectContaining({
      org_id: "org",
      property_id: "property",
      recipient_id: "tenant",
      tenancy_id: "tenancy",
      request_id: null,
      body: "Synthetic reply",
      idempotency_key: expect.any(String),
    }),
  );
});

test("owner oversight shows transcript without a reply control", () => {
  mockConversations = [
    {
      id: "thread",
      org_id: "org",
      property_id: "property",
      property_name: "Synthetic property",
      participants: ["Synthetic manager", "Synthetic tenant"],
      tenancy_id: "tenancy",
      request_id: null,
      provider_id: null,
      context_label: "Unit A01",
      observer: true,
      messages: [
        {
          id: "message",
          sender_id: "tenant",
          sender: "Synthetic tenant",
          body: "Synthetic tenant question",
          created_at: "2026-01-01T12:00:00Z",
        },
      ],
    },
  ];
  const view = render(<NativeMessaging />);
  fireEvent.press(
    view.getByRole("button", {
      name: "Synthetic manager / Synthetic tenant / Synthetic property / Unit A01 / Owner oversight",
    }),
  );
  expect(view.getByText("Owner oversight - read-only")).toBeTruthy();
  expect(view.getByText("Synthetic tenant question")).toBeTruthy();
  expect(view.queryByRole("button", { name: "Send message" })).toBeNull();
});
