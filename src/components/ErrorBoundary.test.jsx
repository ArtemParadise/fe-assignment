import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import ErrorBoundary from "./ErrorBoundary";

// React logs caught render errors to console.error regardless of the boundary,
// so every test here silences it to keep the output readable.
let consoleError;

function Boom() {
  throw new Error("render exploded");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("should render its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>dashboard</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should render a fallback instead of unmounting the tree when a child throws (issue #24, fixed)", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("should log the error it caught (issue #24, fixed)", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(consoleError).toHaveBeenCalledWith(
      "Uncaught render error",
      expect.objectContaining({ message: "render exploded" }),
      expect.anything(),
    );
  });

  it("should offer a reload as the way out of the fallback", async () => {
    const reload = vi.fn();

    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      reload,
    });

    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "Reload the page" }));

    expect(reload).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });
});
