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

  it("should discard a stale response that shares its symbol with the latest request (AAPL -> NVDA -> AAPL)", async () => {
    const aapl1 = createDeferred();
    const nvda = createDeferred();
    const aapl2 = createDeferred();
    const aaplCalls = [aapl1, aapl2];

    fetchStockDetails.mockImplementation((symbol) =>
      symbol === "AAPL" ? aaplCalls.shift().promise : nvda.promise,
    );

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));
    act(() => result.current.viewStockDetails("NVDA"));
    act(() => result.current.viewStockDetails("AAPL"));

    expect(result.current.loading).toBe(true);

    // The first, now-stale AAPL request resolves after the third request
    // (also AAPL) was issued. Since it shares its symbol with the latest
    // request, a symbol-based staleness check would wrongly accept it.
    aapl1.resolve({ ...aaplDetails, price: "1.00" });
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.stockDetails).toBeNull();
    expect(result.current.loading).toBe(true);

    nvda.resolve({ ...aaplDetails, symbol: "NVDA" });
    await new Promise((r) => setTimeout(r, 0));

    // The stale NVDA-slot response must not overwrite state meant for the
    // still-pending latest (second AAPL) request either.
    expect(result.current.stockDetails).toBeNull();
    expect(result.current.loading).toBe(true);

    aapl2.resolve({ ...aaplDetails, price: "200.00" });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stockDetails).toEqual({ ...aaplDetails, price: "200.00" });
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

  it("should start with no price history and not loading it", () => {
    const { result } = renderHook(() => useStockDetails());

    expect(result.current.priceHistory).toBeNull();
    expect(result.current.priceHistoryLoading).toBe(false);
  });

  it("should fetch and populate historical prices for the current details' symbol when loadPriceHistory is called (issue #16, fixed)", async () => {
    const historicalPrices = [{ date: "2026-01-01", price: "987.65" }];

    fetchStockDetails.mockResolvedValue(aaplDetails);
    fetchHistoricalPrices.mockResolvedValue(historicalPrices);

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));
    await waitFor(() => expect(result.current.stockDetails).toEqual(aaplDetails));

    act(() => result.current.loadPriceHistory());
    expect(result.current.priceHistoryLoading).toBe(true);

    await waitFor(() => expect(result.current.priceHistoryLoading).toBe(false));

    expect(fetchHistoricalPrices).toHaveBeenCalledWith("AAPL");
    expect(result.current.priceHistory).toEqual(historicalPrices);
  });

  it("should discard a stale price-history response for a stock that's no longer selected", async () => {
    const aaplHistory = createDeferred();

    fetchStockDetails.mockResolvedValueOnce({ ...aaplDetails, symbol: "AAPL" });
    fetchHistoricalPrices.mockReturnValueOnce(aaplHistory.promise);

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));
    await waitFor(() => expect(result.current.stockDetails?.symbol).toBe("AAPL"));

    act(() => result.current.loadPriceHistory());

    fetchStockDetails.mockResolvedValueOnce({ ...aaplDetails, symbol: "NVDA" });
    act(() => result.current.viewStockDetails("NVDA"));
    await waitFor(() => expect(result.current.stockDetails?.symbol).toBe("NVDA"));

    aaplHistory.resolve([{ date: "2026-01-01", price: "1.00" }]);
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.priceHistory).toBeNull();
    expect(result.current.priceHistoryLoading).toBe(false);
  });

  it("should reset price history when a new stock's details are requested", async () => {
    const historicalPrices = [{ date: "2026-01-01", price: "987.65" }];

    fetchStockDetails.mockResolvedValue(aaplDetails);
    fetchHistoricalPrices.mockResolvedValue(historicalPrices);

    const { result } = renderHook(() => useStockDetails());

    act(() => result.current.viewStockDetails("AAPL"));
    await waitFor(() => expect(result.current.stockDetails).toEqual(aaplDetails));

    act(() => result.current.loadPriceHistory());
    await waitFor(() => expect(result.current.priceHistory).toEqual(historicalPrices));

    act(() => result.current.viewStockDetails("NVDA"));

    expect(result.current.priceHistory).toBeNull();

    await waitFor(() => expect(result.current.stockDetails).toEqual(aaplDetails));
  });
});
