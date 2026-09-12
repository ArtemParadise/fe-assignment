import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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
