import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createDeferred } from "../test/deferred";
import { fetchStockDetails, fetchHistoricalPrices } from "../utils/mockStockApi";

import { useStockDetails } from "./useStockDetails";

// Unit-level counterpart to the details/price-history behavior locked down
// through the DOM in StockList.test.jsx (loading indicator, the issue #4
// race-condition fix, the issue #17 error logging, and the issue #16 price
// history log). Those stay in place as the end-to-end regression check;
// these test the extracted hook's own state management directly.

vi.mock("../utils/mockStockApi", () => ({
  fetchStockDetails: vi.fn(),
  fetchHistoricalPrices: vi.fn(),
}));

const aaplDetails = {
  symbol: "AAPL",
  name: "AAPL Corporation",
  price: "200.00",
};

describe("useStockDetails", () => {
  beforeEach(() => {
    fetchStockDetails.mockReset();
    fetchHistoricalPrices.mockReset();
  });

  it("should start with no details and not loading", () => {
    const { result } = renderHook(() => useStockDetails());

    expect(result.current.stockDetails).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should set loading immediately when requesting details", () => {
    fetchStockDetails.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));

    expect(result.current.loading).toBe(true);
  });

  it("should populate details and clear loading once the fetch resolves", async () => {
    fetchStockDetails.mockResolvedValue(aaplDetails);

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stockDetails).toEqual(aaplDetails);
  });

  it("should discard a stale response when a newer request was issued after it (issue #4, fixed)", async () => {
    const aapl = createDeferred();
    const nvda = createDeferred();

    fetchStockDetails.mockImplementation((symbol) =>
      symbol === "AAPL" ? aapl.promise : nvda.promise,
    );

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));
    act(() => result.current.viewStockDetails("NVDA"));

    nvda.resolve({ ...aaplDetails, symbol: "NVDA" });
    await waitFor(() => expect(result.current.stockDetails?.symbol).toBe("NVDA"));

    aapl.resolve(aaplDetails);
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.stockDetails.symbol).toBe("NVDA");
  });

  it("should log the error and clear loading if fetchStockDetails rejects (issue #17, fixed)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = new Error("network down");

    fetchStockDetails.mockRejectedValue(error);

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));

    await waitFor(() => expect(logSpy).toHaveBeenCalledWith(error));
    expect(result.current.loading).toBe(false);

    logSpy.mockRestore();
  });

  it("should fetch and log historical prices for the current details' symbol when loadPriceHistory is called (issue #16, never rendered)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const historicalPrices = [{ date: "2026-01-01", price: "987.65" }];

    fetchStockDetails.mockResolvedValue(aaplDetails);
    fetchHistoricalPrices.mockResolvedValue(historicalPrices);

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));
    await waitFor(() => expect(result.current.stockDetails).toEqual(aaplDetails));

    await act(() => result.current.loadPriceHistory());

    expect(fetchHistoricalPrices).toHaveBeenCalledWith("AAPL");
    expect(logSpy).toHaveBeenCalledWith("Historical prices:", historicalPrices);

    logSpy.mockRestore();
  });
});
