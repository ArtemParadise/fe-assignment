import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useClickOutside } from "./useClickOutside";

// Extracted from SearchBar's outside-click-to-close dropdown behavior
// (issue #23, docs/known-issues.md), tested here as its own reusable hook.

describe("useClickOutside", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should call the handler when a mousedown happens outside the ref'd element", () => {
    const onOutsideClick = vi.fn();
    const ref = { current: container };

    renderHook(() => useClickOutside(ref, onOutsideClick));

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it("should not call the handler when a mousedown happens inside the ref'd element", () => {
    const onOutsideClick = vi.fn();
    const ref = { current: container };

    renderHook(() => useClickOutside(ref, onOutsideClick));

    container.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("should not attach a listener at all while disabled", () => {
    const onOutsideClick = vi.fn();
    const ref = { current: container };

    renderHook(() => useClickOutside(ref, onOutsideClick, false));

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("should not throw when the ref holds no element yet (issue #29, fixed)", () => {
    const onOutsideClick = vi.fn();
    const ref = { current: null };

    renderHook(() => useClickOutside(ref, onOutsideClick));

    expect(() =>
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
    ).not.toThrow();
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("should call the latest handler after a re-render, not a stale one", () => {
    const ref = { current: container };
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) => useClickOutside(ref, handler),
      { initialProps: { handler: first } },
    );

    rerender({ handler: second });
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("should remove its listener on unmount", () => {
    const onOutsideClick = vi.fn();
    const ref = { current: container };

    const { unmount } = renderHook(() => useClickOutside(ref, onOutsideClick));

    unmount();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).not.toHaveBeenCalled();
  });
});
