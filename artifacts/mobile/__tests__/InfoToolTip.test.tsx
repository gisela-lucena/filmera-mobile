import { act, fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text } from "react-native";

import {
  InfoToolTipProvider,
  useInfoToolTip,
} from "@/components/InfoToolTip";

function Trigger() {
  const { showInfoTooltip } = useInfoToolTip();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => showInfoTooltip("success", "Favorite saved")}
    >
      <Text>Show message</Text>
    </Pressable>
  );
}

describe("InfoToolTipProvider", () => {
  afterEach(() => jest.useRealTimers());

  test("shows and manually closes a message", () => {
    render(
      <InfoToolTipProvider>
        <Trigger />
      </InfoToolTipProvider>,
    );

    fireEvent.press(screen.getByText("Show message"));
    expect(screen.getByText("Favorite saved")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText("Close message"));
    expect(screen.queryByText("Favorite saved")).not.toBeOnTheScreen();
  });

  test("automatically closes a message after three seconds", () => {
    jest.useFakeTimers();
    render(
      <InfoToolTipProvider>
        <Trigger />
      </InfoToolTipProvider>,
    );

    fireEvent.press(screen.getByText("Show message"));
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByText("Favorite saved")).not.toBeOnTheScreen();
  });

  test("requires consumers to be inside the provider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow(
      "useInfoToolTip must be used inside InfoToolTipProvider",
    );
    consoleError.mockRestore();
  });
});
