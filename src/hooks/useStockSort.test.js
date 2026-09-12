import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useStockSort } from "./useStockSort";

const stocks = [
  {
    id: 5,
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 238.45,
    sector: "Automotive",
    change: -3.4,
    volume: 98000000,
  },
  {
    id: 1,
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.52,
    sector: "Technology",
    change: 2.3,
    volume: 52000000,
  },
  {
    id: 7,
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.28,
    sector: "Technology",
    change: 5.7,
    volume: 42000000,
  },
];

function symbols(sorted) {
  return sorted.map((s) => s.symbol);
}

describe("useStockSort", () => {
  it("should sort by symbol ascending by default, regardless of input order", () => {
    const { result } = renderHook(() => useStockSort(stocks, {}));

    expect(symbols(result.current.sortedStocks)).toEqual(["AAPL", "NVDA", "TSLA"]);
  });

  it.each([
    ["price", ["AAPL", "TSLA", "NVDA"], ["NVDA", "TSLA", "AAPL"]],
    ["change", ["TSLA", "AAPL", "NVDA"], ["NVDA", "AAPL", "TSLA"]],
    ["volume", ["NVDA", "AAPL", "TSLA"], ["TSLA", "AAPL", "NVDA"]],
    // Sector ties (AAPL/NVDA are both "Technology") are broken by a stable
    // sort, which keeps their relative order from the input array
    // ([TSLA, AAPL, NVDA]) - not alphabetically by symbol or name.
    ["sector", ["TSLA", "AAPL", "NVDA"], ["AAPL", "NVDA", "TSLA"]],
  ])(
    "should sort by %s ascending on first call and descending on second",
    (field, ascending, descending) => {
      const { result } = renderHook(() => useStockSort(stocks, {}));

      act(() => result.current.handleSort(field));
      expect(symbols(result.current.sortedStocks)).toEqual(ascending);

      act(() => result.current.handleSort(field));
      expect(symbols(result.current.sortedStocks)).toEqual(descending);
    },
  );

  it("should reset to ascending order when switching the sort field", () => {
    const { result } = renderHook(() => useStockSort(stocks, {}));

    act(() => result.current.handleSort("price"));
    act(() => result.current.handleSort("price")); // now descending
    act(() => result.current.handleSort("volume"));

    expect(result.current.sortOrder).toBe("asc");
  });

  it("should sort by average price once every stock's metrics are available", () => {
    const stockMetrics = {
      5: { avgPrice: 10 },
      1: { avgPrice: 20 },
      7: { avgPrice: 30 },
    };

    const { result } = renderHook(() => useStockSort(stocks, stockMetrics));

    act(() => result.current.handleSort("metrics"));

    expect(symbols(result.current.sortedStocks)).toEqual(["TSLA", "AAPL", "NVDA"]);
  });

  it("should not throw and should keep original order when sorting by average price before any metrics have loaded (fixes critical bug #1)", () => {
    const { result } = renderHook(() => useStockSort(stocks, {}));

    act(() => result.current.handleSort("metrics"));

    expect(symbols(result.current.sortedStocks)).toEqual(["TSLA", "AAPL", "NVDA"]);
  });

  it("should sort stocks with loaded metrics first and push stocks with missing metrics to the end, in both directions", () => {
    const stockMetrics = {
      5: { avgPrice: 10 }, // TSLA
      7: { avgPrice: 30 }, // NVDA
      // AAPL (id 1) metrics not loaded yet
    };

    const { result } = renderHook(() => useStockSort(stocks, stockMetrics));

    act(() => result.current.handleSort("metrics"));
    expect(symbols(result.current.sortedStocks)).toEqual(["TSLA", "NVDA", "AAPL"]);

    act(() => result.current.handleSort("metrics"));
    expect(symbols(result.current.sortedStocks)).toEqual(["NVDA", "TSLA", "AAPL"]);
  });

  it("should return an empty sortedStocks list when given an empty stock list", () => {
    const { result } = renderHook(() => useStockSort([], {}));

    expect(result.current.sortedStocks).toEqual([]);
  });
});
