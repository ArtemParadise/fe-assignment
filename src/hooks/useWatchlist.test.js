import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { useWatchlist } from "./useWatchlist";

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

  it("should fall back to an empty watchlist if localStorage holds a JSON null", () => {
    localStorage.setItem("watchlist", JSON.stringify(null));

    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual([]);
  });

  it("should fall back to an empty watchlist if localStorage holds a JSON object", () => {
    localStorage.setItem("watchlist", JSON.stringify({ 1: true }));

    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual([]);
  });
});
