import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text } from "react-native";

import { ErrorBoundary, ErrorBoundaryProps } from "@/components/ErrorBoundary";
import { ErrorFallbackProps } from "@/components/ErrorFallback";

function BrokenComponent(): React.ReactNode {
  throw new Error("render failed");
}

function TestFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Pressable accessibilityRole="button" onPress={resetError}>
      <Text>{error.message}</Text>
    </Pressable>
  );
}

describe("ErrorBoundary", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => consoleError.mockRestore());

  test("renders children while no error occurs", () => {
    render(
      <ErrorBoundary FallbackComponent={TestFallback}>
        <Text>Healthy content</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Healthy content")).toBeOnTheScreen();
  });

  test("renders the fallback and reports render errors", () => {
    const onError: NonNullable<ErrorBoundaryProps["onError"]> = jest.fn();
    render(
      <ErrorBoundary FallbackComponent={TestFallback} onError={onError}>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("render failed")).toBeOnTheScreen();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
  });
});
