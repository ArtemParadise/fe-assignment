import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { useWatchlist } from "./useWatchlist";

// Unit-level counterpart to the watchlist behavior locked down through the
// DOM in StockList.test.jsx (star toggling, unaffected sibling stocks, and
// the issue #3 persistence fix). Those stay in place as the end-to-end
// regression check; these test the extracted hook's own contract directly.

describe("useWatchlist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should start with an empty watchlist", () => {
    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual([]);
  });

  it("should add a stock id when toggled on", () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.toggleWatchlist(1));

    expect(result.current.watchlist).toEqual([1]);
  });

  it("should remove a stock id when toggled again", () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.toggleWatchlist(1));
    act(() => result.current.toggleWatchlist(1));

    expect(result.current.watchlist).toEqual([]);
  });

  it("should track multiple stock ids independently", () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.toggleWatchlist(1));
    act(() => result.current.toggleWatchlist(2));
    act(() => result.current.toggleWatchlist(1));

    expect(result.current.watchlist).toEqual([2]);
  });

  it("should persist to localStorage when a stock is toggled on (issue #3, fixed)", () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.toggleWatchlist(1));

    expect(JSON.parse(localStorage.getItem("watchlist"))).toEqual([1]);
  });

  it("should persist to localStorage when a stock is toggled off (issue #3, fixed)", () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.toggleWatchlist(1));
    act(() => result.current.toggleWatchlist(1));

    expect(JSON.parse(localStorage.getItem("watchlist"))).toEqual([]);
  });

  it("should initialize from a previously stored watchlist (issue #3, fixed)", () => {
    localStorage.setItem("watchlist", JSON.stringify([2, 5]));

    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual([2, 5]);
  });

  it("should fall back to an empty watchlist if localStorage holds invalid JSON", () => {
    localStorage.setItem("watchlist", "not valid json");

    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual([]);
  });
});
