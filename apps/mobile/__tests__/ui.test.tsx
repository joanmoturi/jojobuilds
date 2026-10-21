import { fireEvent, render } from "@testing-library/react-native";
import { expect, jest, test } from "@jest/globals";
import { Button, ErrorState, Tag } from "../src/ui";

jest.mock("../src/auth", () => ({ useAuth: () => ({ org: null }) }));
jest.mock("@expo/vector-icons/Ionicons", () => "Icon");

test("a pending operation disables repeated presses", () => {
  const submit = jest.fn();
  const view = render(<Button label="Saving..." disabled onPress={submit} />);
  fireEvent.press(view.getByRole("button", { name: "Saving..." }));
  expect(submit).not.toHaveBeenCalled();
});

test("an explicit retry is available after a failed request", () => {
  const retry = jest.fn();
  const view = render(<ErrorState error="Connection interrupted" retry={retry} />);
  expect(view.getByText("Connection interrupted")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("reversed status remains readable without color", () => {
  expect(render(<Tag text="Reversed" tone="red" />).getByText("Reversed")).toBeTruthy();
});
