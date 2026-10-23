import type { Session } from "@jojobuilds/api-client";
import { afterEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Button, Text, View } from "react-native";
import { AppProvider, useAuth } from "../src/auth";

jest.mock("expo-secure-store");

afterEach(() => {
  jest.restoreAllMocks();
});

function SessionProbe() {
  const { org, selectOrg } = useAuth();
  return (
    <View>
      <Text>{org?.name ?? "Restoring"}</Text>
      <Button title="Switch portfolio" onPress={() => selectOrg("synthetic-two")} />
    </View>
  );
}

test("switching organizations does not restore the secure session again", async () => {
  const session: Session = {
    provider_access: false,
    user_id: "synthetic-user",
    name: "Synthetic Owner",
    email: "owner@example.com",
    csrf: "synthetic-csrf",
    organizations: ["one", "two"].map((suffix) => ({
      id: `synthetic-${suffix}`,
      name: `Synthetic portfolio ${suffix}`,
      role: "owner",
      currency: "KES",
      timezone: "Africa/Nairobi",
      demo: true,
    })),
  };
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("synthetic-mobile-token");
  const fetchSession = jest.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(session), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  const view = render(
    <AppProvider>
      <SessionProbe />
    </AppProvider>,
  );
  await view.findByText("Synthetic portfolio one");
  fireEvent.press(view.getByText("Switch portfolio"));
  await view.findByText("Synthetic portfolio two");
  expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
  expect(fetchSession).toHaveBeenCalledTimes(1);
});
