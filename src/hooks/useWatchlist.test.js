import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useWatchlist } from "./useWatchlist";

// Unit-level counterpart to the watchlist behavior locked down through the
// DOM in StockList.test.jsx (star toggling, unaffected sibling stocks).
// Those stay in place as the end-to-end regression check; these test the
// extracted hook's own contract directly.

describe("useWatchlist", () => {
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
});
