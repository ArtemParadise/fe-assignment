import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StockList from "./StockList";
import {
  fetchStockDetails,
  fetchStockNews,
  fetchHistoricalPrices,
} from "../utils/mockStockApi";
import { createDeferred } from "../test/deferred";

// Baseline for the upcoming refactor: locks down StockList's current,
// observable behavior - both its intended features and its documented
// bugs (see docs/known-issues.md) - so that after refactoring, a failing
// test here means "something changed" rather than "something broke", and
// the report can call out on purpose which of these were deliberately fixed.

vi.mock("../utils/mockStockApi", () => ({
  fetchStockDetails: vi.fn(),
  fetchStockNews: vi.fn(),
  fetchHistoricalPrices: vi.fn(),
}));

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

const aaplDetails = {
  symbol: "AAPL",
  name: "AAPL Corporation",
  price: "200.00",
  change: "1.00",
  volume: 3000000,
  marketCap: 4500000000,
  pe: "20.00",
  eps: "5.00",
  high52: "250.00",
  low52: "150.00",
  dividend: "1.00",
  beta: "1.00",
};

function getCardTitles() {
  return screen.queryAllByRole("heading", { level: 3 }).map((el) => el.textContent);
}

function cardFor(symbol) {
  return screen.getByRole("heading", { level: 3, name: symbol }).closest(".user-card");
}

describe("StockList", () => {
  beforeEach(() => {
    fetchStockDetails.mockReset().mockResolvedValue(aaplDetails);
    fetchStockNews.mockReset().mockResolvedValue([]);
    fetchHistoricalPrices
      .mockReset()
      .mockResolvedValue([{ date: "2026-01-01", price: "100.00" }]);
  });

  describe("rendering the stock grid", () => {
    it("should render one card per stock", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(getCardTitles()).toHaveLength(3);
    });

    it("should show the running count of currently visible stocks in the heading", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(screen.getByText("Stocks (3)")).toBeInTheDocument();
    });

    it("should sort by symbol ascending by default, regardless of input order", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(getCardTitles()).toEqual(["AAPL", "NVDA", "TSLA"]);
    });

    it("should render the company name, formatted price, sector, and volume in millions on each card", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      const aaplCard = cardFor("AAPL");
      expect(within(aaplCard).getByText("Apple Inc.")).toBeInTheDocument();
      expect(within(aaplCard).getByText("$178.52")).toBeInTheDocument();
      expect(within(aaplCard).getByText("Technology")).toBeInTheDocument();
      expect(within(aaplCard).getByText("Volume: 52.0M")).toBeInTheDocument();
    });

    it("should prefix a positive change with a '+' sign and render it in green", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      const change = within(cardFor("AAPL")).getByText("+2.30%");
      expect(change).toHaveStyle({ color: "rgb(0, 128, 0)" });
    });

    it("should render a negative change without a leading sign and in red", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      const change = within(cardFor("TSLA")).getByText("-3.40%");
      expect(change).toHaveStyle({ color: "rgb(255, 0, 0)" });
    });

    it("should show 'Loading...' for average price until historical prices resolve", () => {
      fetchHistoricalPrices.mockReturnValue(new Promise(() => {}));
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(within(cardFor("AAPL")).getByText("Avg: Loading...")).toBeInTheDocument();
    });

    it("should replace 'Loading...' with the computed average price once historical prices resolve", async () => {
      fetchHistoricalPrices.mockResolvedValue([
        { date: "2026-01-01", price: "100.00" },
        { date: "2026-01-02", price: "200.00" },
      ]);
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(
        await within(cardFor("AAPL")).findByText("Avg: 150.00"),
      ).toBeInTheDocument();
    });
  });

  describe("filtering by search term", () => {
    it("should show only stocks whose symbol matches the search term", () => {
      render(<StockList stocks={stocks} searchTerm="AAPL" />);

      expect(getCardTitles()).toEqual(["AAPL"]);
    });

    it("should show only stocks whose name matches the search term, case-insensitively", () => {
      render(<StockList stocks={stocks} searchTerm="tesla" />);

      expect(getCardTitles()).toEqual(["TSLA"]);
    });

    it("should show every stock when the search term is empty", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(getCardTitles()).toHaveLength(3);
    });

    it("should show zero stocks and 'Stocks (0)' when nothing matches", () => {
      render(<StockList stocks={stocks} searchTerm="doesnotexist" />);

      expect(screen.getByText("Stocks (0)")).toBeInTheDocument();
      expect(getCardTitles()).toHaveLength(0);
    });
  });

  describe("sorting", () => {
    it.each([
      ["Price", ["AAPL", "TSLA", "NVDA"], ["NVDA", "TSLA", "AAPL"]],
      ["Change", ["TSLA", "AAPL", "NVDA"], ["NVDA", "AAPL", "TSLA"]],
      ["Volume", ["NVDA", "AAPL", "TSLA"], ["TSLA", "AAPL", "NVDA"]],
      // Sector ties (AAPL/NVDA are both "Technology") are broken by a
      // stable sort, which keeps their relative order from the `stocks`
      // prop ([TSLA, AAPL, NVDA]) - not alphabetically by symbol or name.
      ["Sector", ["TSLA", "AAPL", "NVDA"], ["AAPL", "NVDA", "TSLA"]],
    ])(
      "should sort by %s ascending on first click and descending on second click",
      async (field, ascending, descending) => {
        const user = userEvent.setup();
        render(<StockList stocks={stocks} searchTerm="" />);

        await user.click(screen.getByRole("button", { name: new RegExp(`^${field}`) }));
        expect(getCardTitles()).toEqual(ascending);

        await user.click(screen.getByRole("button", { name: new RegExp(`^${field}`) }));
        expect(getCardTitles()).toEqual(descending);
      },
    );

    it("should sort by symbol descending on the first click, since symbol-ascending is already the default sort", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      expect(getCardTitles()).toEqual(["AAPL", "NVDA", "TSLA"]); // default

      await user.click(screen.getByRole("button", { name: /^Symbol/ }));
      expect(getCardTitles()).toEqual(["TSLA", "NVDA", "AAPL"]);

      await user.click(screen.getByRole("button", { name: /^Symbol/ }));
      expect(getCardTitles()).toEqual(["AAPL", "NVDA", "TSLA"]);
    });

    it("should show an ascending arrow on the active sort button, and switch to descending on a second click", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(screen.getByRole("button", { name: /^Price/ }));
      expect(screen.getByRole("button", { name: /^Price/ })).toHaveTextContent("↑");

      await user.click(screen.getByRole("button", { name: /^Price/ }));
      expect(screen.getByRole("button", { name: /^Price/ })).toHaveTextContent("↓");
    });

    it("should reset to ascending order when switching the sort field", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(screen.getByRole("button", { name: /^Price/ }));
      await user.click(screen.getByRole("button", { name: /^Price/ })); // now descending
      await user.click(screen.getByRole("button", { name: /^Volume/ }));

      expect(screen.getByRole("button", { name: /^Volume/ })).toHaveTextContent("↑");
    });

    it("should sort by average price once historical prices have resolved for every stock", async () => {
      fetchHistoricalPrices.mockImplementation((symbol) => {
        const byPrice = { TSLA: "10.00", AAPL: "20.00", NVDA: "30.00" };
        return Promise.resolve([{ date: "2026-01-01", price: byPrice[symbol] }]);
      });
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      await waitFor(() =>
        expect(within(cardFor("NVDA")).getByText("Avg: 30.00")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /^Avg Price/ }));

      expect(getCardTitles()).toEqual(["TSLA", "AAPL", "NVDA"]);
    });

    it("should throw when sorting by average price before every stock's metrics have loaded (known critical bug #1)", async () => {
      fetchHistoricalPrices.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await expect(
        user.click(screen.getByRole("button", { name: /^Avg Price/ })),
      ).rejects.toThrow(/reading 'avgPrice'/);
    });
  });

  describe("filtering by sector", () => {
    it("should list 'All Sectors' plus every unique sector as options", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      const options = within(screen.getByRole("combobox")).getAllByRole("option");
      expect(options.map((o) => o.textContent)).toEqual([
        "All Sectors",
        "Automotive",
        "Technology",
      ]);
    });

    it("should show only stocks in the selected sector", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.selectOptions(screen.getByRole("combobox"), "Automotive");

      expect(getCardTitles()).toEqual(["TSLA"]);
    });

    it("should combine the sector filter with the search term filter", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="a" />);

      await user.selectOptions(screen.getByRole("combobox"), "Technology");

      expect(getCardTitles()).toEqual(["AAPL", "NVDA"]);
    });

    it("should show every stock again when 'All Sectors' is reselected", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.selectOptions(screen.getByRole("combobox"), "Automotive");
      await user.selectOptions(screen.getByRole("combobox"), "All Sectors");

      expect(getCardTitles()).toHaveLength(3);
    });

    it("should keep listing a sector's option even once search text filters all its stocks out (existing behavior)", () => {
      render(<StockList stocks={stocks} searchTerm="tesla" />);

      const options = within(screen.getByRole("combobox")).getAllByRole("option");
      expect(options.map((o) => o.textContent)).toEqual(
        expect.arrayContaining(["Technology"]),
      );
    });
  });

  describe("watchlist", () => {
    it("should render an empty star for every stock by default", () => {
      render(<StockList stocks={stocks} searchTerm="" />);

      expect(screen.getAllByRole("button", { name: "☆" })).toHaveLength(3);
    });

    it("should switch a stock's star to filled when toggled on", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "☆" }));

      expect(within(cardFor("AAPL")).getByRole("button", { name: "★" })).toBeInTheDocument();
    });

    it("should switch the star back to empty when toggled off again", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      const star = () => within(cardFor("AAPL")).getByRole("button", { name: /[★☆]/ });
      await user.click(star());
      await user.click(star());

      expect(within(cardFor("AAPL")).getByRole("button", { name: "☆" })).toBeInTheDocument();
    });

    it("should not affect any other stock's star", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "☆" }));

      expect(within(cardFor("TSLA")).getByRole("button", { name: "☆" })).toBeInTheDocument();
      expect(within(cardFor("NVDA")).getByRole("button", { name: "☆" })).toBeInTheDocument();
    });

    it("should add a 'favorite' class to a watchlisted card", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "☆" }));

      expect(cardFor("AAPL")).toHaveClass("favorite");
    });

    it("should bold the change percentage on a watchlisted card", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "☆" }));

      expect(within(cardFor("AAPL")).getByText("+2.30%")).toHaveStyle({
        fontWeight: "bold",
      });
    });

    it("should not persist the watchlist to localStorage (known issue #3, despite README claiming it does)", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "☆" }));

      expect(window.localStorage.length).toBe(0);
    });
  });

  describe("stock details", () => {
    it("should request details for the clicked stock's symbol", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));

      expect(fetchStockDetails).toHaveBeenCalledWith("AAPL");
    });

    it("should show a loading indicator while details are pending", async () => {
      fetchStockDetails.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));

      expect(screen.getByText("Loading stock details...")).toBeInTheDocument();
    });

    it("should render every field of the resolved details panel, correctly formatted", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));

      expect(await screen.findByText("Stock Details - AAPL")).toBeInTheDocument();
      expect(screen.getByText("Company: AAPL Corporation")).toBeInTheDocument();
      expect(screen.getByText("Price: $200.00")).toBeInTheDocument();
      expect(screen.getByText("Change: 1.00%")).toBeInTheDocument();
      expect(screen.getByText("Volume: 3.00M")).toBeInTheDocument();
      expect(screen.getByText("Market Cap: $4.50B")).toBeInTheDocument();
      expect(screen.getByText("P/E Ratio: 20.00")).toBeInTheDocument();
      expect(screen.getByText("EPS: $5.00")).toBeInTheDocument();
      expect(screen.getByText("52W High: $250.00")).toBeInTheDocument();
      expect(screen.getByText("52W Low: $150.00")).toBeInTheDocument();
      expect(screen.getByText("Dividend: 1.00%")).toBeInTheDocument();
      expect(screen.getByText("Beta: 1.00")).toBeInTheDocument();
    });

    it("should hide the loading indicator once details resolve", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));
      await screen.findByText("Stock Details - AAPL");

      expect(screen.queryByText("Loading stock details...")).not.toBeInTheDocument();
    });

    it("should display whichever response resolves last, even if it belongs to a stock that is no longer selected (known race condition, issue #4)", async () => {
      const aapl = createDeferred();
      const nvda = createDeferred();
      fetchStockDetails.mockImplementation((symbol) =>
        symbol === "AAPL" ? aapl.promise : nvda.promise,
      );
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      // User clicks AAPL, then quickly clicks NVDA before AAPL's slower
      // response has arrived.
      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));
      await user.click(within(cardFor("NVDA")).getByRole("button", { name: "View Details" }));

      // NVDA's response - the one the user actually asked for last - arrives first.
      nvda.resolve({ ...aaplDetails, symbol: "NVDA", name: "NVDA Corporation" });
      expect(await screen.findByText("Stock Details - NVDA")).toBeInTheDocument();

      // AAPL's slower, stale response arrives afterward and silently
      // overwrites the panel with data for a stock that isn't selected
      // anymore.
      aapl.resolve(aaplDetails);
      expect(await screen.findByText("Stock Details - AAPL")).toBeInTheDocument();
    });

    it("should log the error and leave the loading indicator stuck if fetchStockDetails rejects (known issue #17)", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const error = new Error("network down");
      fetchStockDetails.mockRejectedValue(error);
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));

      await waitFor(() => expect(logSpy).toHaveBeenCalledWith(error));
      expect(screen.getByText("Loading stock details...")).toBeInTheDocument();

      logSpy.mockRestore();
    });

    it("should fetch and log historical prices when 'Load Price History' is clicked (known issue #16 - the result is never rendered anywhere)", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const historicalPrices = [{ date: "2026-01-01", price: "987.65" }];
      fetchHistoricalPrices.mockResolvedValue(historicalPrices);
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));
      await screen.findByText("Stock Details - AAPL");
      logSpy.mockClear(); // drop the calls made by the background avg-price effect
      await user.click(screen.getByRole("button", { name: "Load Price History" }));

      await waitFor(() =>
        expect(fetchHistoricalPrices).toHaveBeenLastCalledWith("AAPL"),
      );
      expect(logSpy).toHaveBeenCalledWith("Historical prices:", historicalPrices);

      logSpy.mockRestore();
    });
  });

  describe("news panel", () => {
    it("should switch the button label to 'Hide News' once expanded", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));

      expect(within(card).getByRole("button", { name: "Hide News" })).toBeInTheDocument();
    });

    it("should not collapse the panel when 'Hide News' is clicked (existing behavior bug: it re-expands the same stock instead of toggling off)", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));
      await user.click(within(card).getByRole("button", { name: "Hide News" }));

      expect(within(card).getByRole("button", { name: "Hide News" })).toBeInTheDocument();
      expect(within(card).getByText("Loading news...")).toBeInTheDocument();
    });

    it("should request news for the clicked stock's symbol", async () => {
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Show News" }));

      expect(fetchStockNews).toHaveBeenCalledWith("AAPL");
    });

    it("should show 'Loading news...' immediately after expanding, before the response arrives", async () => {
      fetchStockNews.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Show News" }));

      expect(within(cardFor("AAPL")).getByText("Loading news...")).toBeInTheDocument();
    });

    it("should stay stuck on 'Loading news...' after the response resolves, if nothing else triggers a re-render (known issue #2)", async () => {
      // No other effect resolves in this test, so nothing re-renders
      // StockList after the news mutation lands.
      fetchHistoricalPrices.mockReturnValue(new Promise(() => {}));
      const news = createDeferred();
      fetchStockNews.mockReturnValue(news.promise);
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));
      await news.resolve([
        { id: 1, title: "AAPL Reports Strong Q4 Earnings", date: "2026-01-20", summary: "..." },
      ]);
      // Flush the resolved promise's `.then` without any state update
      // occurring that would force React to reconcile.
      await new Promise((r) => setTimeout(r, 0));

      expect(within(card).getByText("Loading news...")).toBeInTheDocument();
      expect(screen.queryByText("AAPL Reports Strong Q4 Earnings")).not.toBeInTheDocument();
    });

    it("should eventually reveal news once an unrelated state update happens to re-render the list (known issue #2, timing-dependent)", async () => {
      const news = createDeferred();
      const prices = createDeferred();
      fetchStockNews.mockReturnValue(news.promise);
      fetchHistoricalPrices.mockReturnValue(prices.promise);
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));
      await news.resolve([
        { id: 1, title: "AAPL Reports Strong Q4 Earnings", date: "2026-01-20", summary: "x".repeat(100) },
      ]);
      await new Promise((r) => setTimeout(r, 0));
      expect(within(card).getByText("Loading news...")).toBeInTheDocument();

      // An unrelated historical-prices update resolves afterward, which
      // happens to trigger the re-render that finally surfaces the news.
      prices.resolve([{ date: "2026-01-01", price: "100.00" }]);

      expect(await within(card).findByText("AAPL Reports Strong Q4 Earnings")).toBeInTheDocument();
    });

    it("should show only the first 3 articles, each truncated to 80 characters with an ellipsis", async () => {
      fetchStockNews.mockResolvedValue([
        { id: 1, title: "One", date: "2026-01-01", summary: "a".repeat(100) },
        { id: 2, title: "Two", date: "2026-01-02", summary: "b".repeat(100) },
        { id: 3, title: "Three", date: "2026-01-03", summary: "c".repeat(100) },
        { id: 4, title: "Four", date: "2026-01-04", summary: "d".repeat(100) },
      ]);
      const user = userEvent.setup();
      render(<StockList stocks={stocks} searchTerm="" />);
      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));
      // Force a re-render past the stale-state bug so the resolved list is visible.
      await user.click(within(cardFor("NVDA")).getByRole("button", { name: "☆" }));

      expect(await within(card).findByText("One")).toBeInTheDocument();
      expect(within(card).getByText("Two")).toBeInTheDocument();
      expect(within(card).getByText("Three")).toBeInTheDocument();
      expect(within(card).queryByText("Four")).not.toBeInTheDocument();
      expect(within(card).getByText(`${"a".repeat(80)}...`)).toBeInTheDocument();
    });
  });
});
