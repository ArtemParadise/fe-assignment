import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useStockFilters } from "./useStockFilters";

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

function symbols(list) {
  return list.map((s) => s.symbol);
}

describe("useStockFilters", () => {
  it("should show every stock when the search term is empty and no sector filter is set", () => {
    const { result } = renderHook(() => useStockFilters(stocks, ""));

    expect(symbols(result.current.visibleStocks)).toHaveLength(3);
  });

  it("should return no stocks and no sectors when the stock list is empty", () => {
    const { result } = renderHook(() => useStockFilters([], ""));

    expect(result.current.visibleStocks).toEqual([]);
    expect(result.current.uniqueSectors).toEqual([]);
  });

  it("should filter by symbol, case-insensitively", () => {
    const { result } = renderHook(() => useStockFilters(stocks, "aapl"));

    expect(symbols(result.current.visibleStocks)).toEqual(["AAPL"]);
  });

  it("should filter by name, case-insensitively", () => {
    const { result } = renderHook(() => useStockFilters(stocks, "tesla"));

    expect(symbols(result.current.visibleStocks)).toEqual(["TSLA"]);
  });

  it("should list every unique sector from the full stock list", () => {
    const { result } = renderHook(() => useStockFilters(stocks, ""));

    expect(result.current.uniqueSectors).toEqual(["Automotive", "Technology"]);
  });

  it("should keep listing a sector even once the search term filters all its stocks out (existing behavior)", () => {
    const { result } = renderHook(() => useStockFilters(stocks, "tesla"));

    expect(result.current.uniqueSectors).toContain("Technology");
  });

  it("should narrow visibleStocks to the selected sector", () => {
    const { result } = renderHook(() => useStockFilters(stocks, ""));

    act(() => result.current.setFilterBySector("Automotive"));

    expect(symbols(result.current.visibleStocks)).toEqual(["TSLA"]);
  });

  it("should combine the sector filter with the search term filter", () => {
    const { result } = renderHook(() => useStockFilters(stocks, "a"));

    act(() => result.current.setFilterBySector("Technology"));

    expect(symbols(result.current.visibleStocks)).toEqual(["AAPL", "NVDA"]);
  });
});
