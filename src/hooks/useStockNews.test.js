import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createDeferred } from "../test/deferred";
import { fetchStockNews } from "../utils/mockStockApi";

import { useStockNews } from "./useStockNews";

vi.mock("../utils/mockStockApi", () => ({
  fetchStockNews: vi.fn(),
}));

describe("useStockNews", () => {
  beforeEach(() => {
    fetchStockNews.mockReset();
  });

  it("should start with no expanded stock and no news", () => {
    const { result } = renderHook(() => useStockNews());

    expect(result.current.expandedStock).toBeNull();
    expect(result.current.stockNews).toEqual({});
  });

  it("should expand the requested symbol immediately, before the fetch resolves", () => {
    fetchStockNews.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));

    expect(result.current.expandedStock).toBe("AAPL");
  });

  it("should store the resolved news keyed by symbol", async () => {
    const articles = [
      { id: 1, title: "Headline", date: "2026-01-01", summary: "..." },
    ];

    fetchStockNews.mockResolvedValue(articles);

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));

    await waitFor(() => expect(result.current.stockNews.AAPL).toEqual(articles));
  });

  it("should leave the entry absent while the request is in flight and set it once resolved", async () => {
    const deferred = createDeferred();

    fetchStockNews.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));

    expect(result.current.expandedStock).toBe("AAPL");
    expect(result.current.stockNews.AAPL).toBeUndefined();

    await act(async () => {
      deferred.resolve([]);
      await deferred.promise;
    });

    expect(result.current.stockNews.AAPL).toEqual([]);
  });

  it("should record an empty list if the request rejects, ending the loading state (issue #26, fixed)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchStockNews.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));

    await waitFor(() => expect(result.current.stockNews.AAPL).toEqual([]));

    expect(result.current.expandedStock).toBe("AAPL");
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("should collapse the panel when the already-expanded stock is requested again (issue #15, fixed)", async () => {
    fetchStockNews.mockResolvedValue([]);

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));
    await waitFor(() => expect(result.current.expandedStock).toBe("AAPL"));

    act(() => result.current.loadStockNews("AAPL"));

    expect(result.current.expandedStock).toBeNull();
  });

  it("should not re-fetch news when collapsing an already-expanded stock (issue #15, fixed)", async () => {
    fetchStockNews.mockResolvedValue([]);

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));
    await waitFor(() => expect(result.current.expandedStock).toBe("AAPL"));
    expect(fetchStockNews).toHaveBeenCalledTimes(1);

    act(() => result.current.loadStockNews("AAPL"));

    expect(fetchStockNews).toHaveBeenCalledTimes(1);
  });

  it("should keep a previously loaded stock's news after news for a different stock resolves", async () => {
    fetchStockNews.mockImplementation((symbol) =>
      Promise.resolve([
        { id: 1, title: `${symbol} headline`, date: "2026-01-01", summary: "..." },
      ]),
    );

    const { result } = renderHook(() => useStockNews());

    act(() => result.current.loadStockNews("AAPL"));
    await waitFor(() => expect(result.current.stockNews.AAPL).toBeDefined());

    act(() => result.current.loadStockNews("NVDA"));
    await waitFor(() => expect(result.current.stockNews.NVDA).toBeDefined());

    expect(result.current.stockNews.AAPL[0].title).toBe("AAPL headline");
  });
});
