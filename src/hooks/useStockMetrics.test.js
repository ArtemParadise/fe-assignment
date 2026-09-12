import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchHistoricalPrices } from "../utils/mockStockApi";

import { useStockMetrics } from "./useStockMetrics";

vi.mock("../utils/mockStockApi", () => ({
  fetchHistoricalPrices: vi.fn(),
}));

describe("useStockMetrics", () => {
  beforeEach(() => {
    fetchHistoricalPrices.mockReset();
  });

  it("should start with no metrics before any historical prices resolve", () => {
    fetchHistoricalPrices.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useStockMetrics([{ id: 1, symbol: "AAPL" }]),
    );

    expect(result.current).toEqual({});
  });

  it("should compute the average price and price history length once historical prices resolve", async () => {
    fetchHistoricalPrices.mockResolvedValue([
      { date: "2026-01-01", price: "100.00" },
      { date: "2026-01-02", price: "200.00" },
    ]);

    const { result } = renderHook(() =>
      useStockMetrics([{ id: 1, symbol: "AAPL" }]),
    );

    await waitFor(() => expect(result.current[1]?.avgPrice).toBe(150));
    expect(result.current[1].priceHistory).toBe(2);
  });

  it("should compute metrics for every stock independently", async () => {
    fetchHistoricalPrices.mockImplementation((symbol) => {
      const byPrice = { AAPL: "20.00", TSLA: "10.00" };

      return Promise.resolve([{ date: "2026-01-01", price: byPrice[symbol] }]);
    });

    const { result } = renderHook(() =>
      useStockMetrics([
        { id: 1, symbol: "AAPL" },
        { id: 5, symbol: "TSLA" },
      ]),
    );

    await waitFor(() => {
      expect(result.current[1]?.avgPrice).toBe(20);
      expect(result.current[5]?.avgPrice).toBe(10);
    });
  });

  it("should record a terminal error state and log if a stock's request rejects (issue #26, fixed)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchHistoricalPrices.mockImplementation((symbol) =>
      symbol === "AAPL"
        ? Promise.reject(new Error("network down"))
        : Promise.resolve([{ price: "10.00" }]),
    );

    const { result } = renderHook(() =>
      useStockMetrics([
        { id: 1, symbol: "AAPL" },
        { id: 5, symbol: "TSLA" },
      ]),
    );

    await waitFor(() => expect(result.current[5]?.avgPrice).toBe(10));

    expect(result.current[1]).toEqual({ error: true });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
