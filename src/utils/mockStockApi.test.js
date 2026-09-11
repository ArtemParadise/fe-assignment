import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateStockData,
  fetchStockDetails,
  fetchStockNews,
  fetchHistoricalPrices,
} from "./mockStockApi";

// These specs pin down the exact current output of the mock data layer.
// They exist as a behavior baseline for the upcoming refactor: the
// dataset, field shapes, and value ranges below must still hold afterward
// unless a change is deliberately called out in the refactor report.

describe("mockStockApi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generateStockData", () => {
    it("should resolve after a 500ms delay", async () => {
      const onResolve = vi.fn();
      generateStockData().then(onResolve);

      await vi.advanceTimersByTimeAsync(499);
      expect(onResolve).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(onResolve).toHaveBeenCalledTimes(1);
    });

    it("should resolve with exactly the current 10-stock dataset", async () => {
      const promise = generateStockData();
      await vi.advanceTimersByTimeAsync(500);
      const stocks = await promise;

      expect(stocks).toEqual([
        expect.objectContaining({ id: 1, symbol: "AAPL", name: "Apple Inc." }),
        expect.objectContaining({ id: 2, symbol: "MSFT", name: "Microsoft Corporation" }),
        expect.objectContaining({ id: 3, symbol: "GOOGL", name: "Alphabet Inc." }),
        expect.objectContaining({ id: 4, symbol: "AMZN", name: "Amazon.com Inc." }),
        expect.objectContaining({ id: 5, symbol: "TSLA", name: "Tesla Inc." }),
        expect.objectContaining({ id: 6, symbol: "META", name: "Meta Platforms Inc." }),
        expect.objectContaining({ id: 7, symbol: "NVDA", name: "NVIDIA Corporation" }),
        expect.objectContaining({ id: 8, symbol: "JPM", name: "JPMorgan Chase & Co." }),
        expect.objectContaining({ id: 9, symbol: "V", name: "Visa Inc." }),
        expect.objectContaining({ id: 10, symbol: "WMT", name: "Walmart Inc." }),
      ]);
    });

    it("should resolve with the exact known field values for AAPL", async () => {
      const promise = generateStockData();
      await vi.advanceTimersByTimeAsync(500);
      const stocks = await promise;

      expect(stocks[0]).toEqual({
        id: 1,
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 178.52,
        sector: "Technology",
        marketCap: 2800000000000,
        change: 2.3,
        volume: 52000000,
      });
    });

    it("should resolve with unique, numeric ids and symbols for every stock", async () => {
      const promise = generateStockData();
      await vi.advanceTimersByTimeAsync(500);
      const stocks = await promise;

      const ids = stocks.map((s) => s.id);
      const symbols = stocks.map((s) => s.symbol);
      expect(new Set(ids).size).toBe(stocks.length);
      expect(new Set(symbols).size).toBe(stocks.length);
      ids.forEach((id) => expect(typeof id).toBe("number"));
    });

    it("should include at least one stock in more than one sector", async () => {
      const promise = generateStockData();
      await vi.advanceTimersByTimeAsync(500);
      const stocks = await promise;

      const sectors = new Set(stocks.map((s) => s.sector));
      expect(sectors.size).toBeGreaterThan(1);
      expect([...sectors]).toEqual(
        expect.arrayContaining([
          "Technology",
          "Consumer Cyclical",
          "Automotive",
          "Financial",
          "Consumer Defensive",
        ]),
      );
    });
  });

  describe("fetchStockDetails", () => {
    it("should resolve after a 500-2500ms randomized delay", async () => {
      const onResolve = vi.fn();
      fetchStockDetails("AAPL").then(onResolve);

      await vi.advanceTimersByTimeAsync(499);
      expect(onResolve).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2001);
      expect(onResolve).toHaveBeenCalledTimes(1);
    });

    it("should echo the requested symbol and derive a company name from it", async () => {
      const promise = fetchStockDetails("AAPL");
      await vi.advanceTimersByTimeAsync(2500);
      const details = await promise;

      expect(details.symbol).toBe("AAPL");
      expect(details.name).toBe("AAPL Corporation");
    });

    it("should resolve with numeric-string fields within their generator's documented ranges", async () => {
      const promise = fetchStockDetails("NVDA");
      await vi.advanceTimersByTimeAsync(2500);
      const details = await promise;

      const numeric = (value) => {
        expect(typeof value).toBe("string");
        expect(value).toMatch(/^-?\d+\.\d{2}$/);
        return parseFloat(value);
      };

      expect(numeric(details.price)).toBeGreaterThanOrEqual(50);
      expect(numeric(details.price)).toBeLessThan(550);
      expect(numeric(details.change)).toBeGreaterThanOrEqual(-5);
      expect(numeric(details.change)).toBeLessThan(5);
      expect(numeric(details.pe)).toBeGreaterThanOrEqual(5);
      expect(numeric(details.pe)).toBeLessThan(55);
      expect(numeric(details.eps)).toBeGreaterThanOrEqual(0);
      expect(numeric(details.eps)).toBeLessThan(20);
      expect(numeric(details.high52)).toBeGreaterThanOrEqual(100);
      expect(numeric(details.high52)).toBeLessThan(700);
      expect(numeric(details.low52)).toBeGreaterThanOrEqual(20);
      expect(numeric(details.low52)).toBeLessThan(120);
      expect(numeric(details.dividend)).toBeGreaterThanOrEqual(0);
      expect(numeric(details.dividend)).toBeLessThan(5);
      expect(numeric(details.beta)).toBeGreaterThanOrEqual(0);
      expect(numeric(details.beta)).toBeLessThan(2);
      expect(Number.isInteger(details.volume)).toBe(true);
      expect(details.volume).toBeGreaterThanOrEqual(0);
      expect(details.volume).toBeLessThan(100000000);
      expect(Number.isInteger(details.marketCap)).toBe(true);
      expect(details.marketCap).toBeGreaterThanOrEqual(0);
      expect(details.marketCap).toBeLessThan(3000000000000);
    });

    it("should return freshly randomized data on every call rather than a fixed record for the symbol (known issue #5)", async () => {
      const firstPromise = fetchStockDetails("AAPL");
      await vi.advanceTimersByTimeAsync(2500);
      const first = await firstPromise;

      const secondPromise = fetchStockDetails("AAPL");
      await vi.advanceTimersByTimeAsync(2500);
      const second = await secondPromise;

      // Astronomically unlikely to collide by chance across 10 independently
      // randomized fields - a match here would mean the data isn't random.
      expect(first).not.toEqual(second);
    });
  });

  describe("fetchStockNews", () => {
    it("should resolve after a 1000ms delay", async () => {
      const onResolve = vi.fn();
      fetchStockNews("MSFT").then(onResolve);

      await vi.advanceTimersByTimeAsync(999);
      expect(onResolve).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(onResolve).toHaveBeenCalledTimes(1);
    });

    it("should resolve with exactly 3 articles, each referencing the symbol in its title", async () => {
      const promise = fetchStockNews("MSFT");
      await vi.advanceTimersByTimeAsync(1000);
      const news = await promise;

      expect(news).toEqual([
        {
          id: 1,
          title: "MSFT Reports Strong Q4 Earnings",
          date: "2026-01-20",
          summary:
            "Company exceeds analyst expectations with record revenue growth...",
        },
        {
          id: 2,
          title: "Analysts Upgrade MSFT Price Target",
          date: "2026-01-18",
          summary:
            "Major investment banks raise price targets following positive outlook...",
        },
        {
          id: 3,
          title: "MSFT Announces New Product Launch",
          date: "2026-01-15",
          summary:
            "Innovative product expected to drive future growth and market share...",
        },
      ]);
    });
  });

  describe("fetchHistoricalPrices", () => {
    it("should resolve after an 800ms delay", async () => {
      const onResolve = vi.fn();
      fetchHistoricalPrices("GOOGL").then(onResolve);

      await vi.advanceTimersByTimeAsync(799);
      expect(onResolve).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(onResolve).toHaveBeenCalledTimes(1);
    });

    it("should resolve with 31 days of prices ending on the current date", async () => {
      vi.setSystemTime(new Date("2026-01-31T12:00:00.000Z"));

      const promise = fetchHistoricalPrices("GOOGL");
      await vi.advanceTimersByTimeAsync(800);
      const prices = await promise;

      expect(prices).toHaveLength(31);
      expect(prices[0].date).toBe("2026-01-01");
      expect(prices[30].date).toBe("2026-01-31");
    });

    it("should resolve with prices formatted as 2-decimal numeric strings between 150 and 250", async () => {
      const promise = fetchHistoricalPrices("GOOGL");
      await vi.advanceTimersByTimeAsync(800);
      const prices = await promise;

      for (const entry of prices) {
        expect(entry.price).toMatch(/^\d+\.\d{2}$/);
        const value = parseFloat(entry.price);
        expect(value).toBeGreaterThanOrEqual(150);
        expect(value).toBeLessThan(250);
      }
    });

    it("should list dates in ascending, consecutive day order", async () => {
      vi.setSystemTime(new Date("2026-01-31T12:00:00.000Z"));

      const promise = fetchHistoricalPrices("GOOGL");
      await vi.advanceTimersByTimeAsync(800);
      const prices = await promise;

      const dates = prices.map((p) => new Date(p.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] - dates[i - 1]).toBe(24 * 60 * 60 * 1000);
      }
    });
  });
});
