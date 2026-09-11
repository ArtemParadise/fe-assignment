import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createDeferred } from "../test/deferred";
import {
  fetchStockDetails,
  fetchStockNews,
  fetchHistoricalPrices,
} from "../utils/mockStockApi";

import StockList from "./StockList";

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

      expect(screen.getAllByRole("button", { name: /^Add .* to watchlist$/ })).toHaveLength(3);
    });

    it("should switch a stock's star to filled when toggled on", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Add AAPL to watchlist" }));

      expect(within(cardFor("AAPL")).getByRole("button", { name: "Remove AAPL from watchlist" })).toBeInTheDocument();
    });

    it("should switch the star back to empty when toggled off again", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      const star = () =>
        within(cardFor("AAPL")).getByRole("button", { name: /watchlist$/ });

      await user.click(star());
      await user.click(star());

      expect(within(cardFor("AAPL")).getByRole("button", { name: "Add AAPL to watchlist" })).toBeInTheDocument();
    });

    it("should not affect any other stock's star", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Add AAPL to watchlist" }));

      expect(within(cardFor("TSLA")).getByRole("button", { name: "Add TSLA to watchlist" })).toBeInTheDocument();
      expect(within(cardFor("NVDA")).getByRole("button", { name: "Add NVDA to watchlist" })).toBeInTheDocument();
    });

    it("should add a 'favorite' class to a watchlisted card", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Add AAPL to watchlist" }));

      expect(cardFor("AAPL")).toHaveClass("favorite");
    });

    it("should bold the change percentage on a watchlisted card", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Add AAPL to watchlist" }));

      expect(within(cardFor("AAPL")).getByText("+2.30%")).toHaveStyle({
        fontWeight: "bold",
      });
    });

    it("should not persist the watchlist to localStorage (known issue #3, despite README claiming it does)", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Add AAPL to watchlist" }));

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

    it("should hide the loading indicator once details resolve", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));
      await screen.findByText("Stock Details - AAPL");

      expect(screen.queryByText("Loading stock details...")).not.toBeInTheDocument();
    });

    it("should keep showing the most recently requested stock's details when an older, slower request resolves afterward (issue #4, fixed)", async () => {
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
      await nvda.resolve({ ...aaplDetails, symbol: "NVDA", name: "NVDA Corporation" });
      expect(await screen.findByText("Stock Details - NVDA")).toBeInTheDocument();

      // AAPL's slower, stale response arrives afterward and is now discarded
      // instead of overwriting the panel with data for a stock that isn't
      // selected anymore.
      await aapl.resolve(aaplDetails);
      await new Promise((r) => setTimeout(r, 0));

      expect(screen.getByText("Stock Details - NVDA")).toBeInTheDocument();
      expect(screen.queryByText("Stock Details - AAPL")).not.toBeInTheDocument();
    });

    it("should log the error and clear the loading indicator if fetchStockDetails rejects (known issue #17, fixed)", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const error = new Error("network down");

      fetchStockDetails.mockRejectedValue(error);

      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "View Details" }));

      await waitFor(() => expect(logSpy).toHaveBeenCalledWith(error));
      expect(screen.queryByText("Loading stock details...")).not.toBeInTheDocument();

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

    it("should collapse the panel when 'Hide News' is clicked on an already-expanded stock", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));
      await user.click(within(card).getByRole("button", { name: "Hide News" }));

      expect(within(card).getByRole("button", { name: "Show News" })).toBeInTheDocument();
      expect(within(card).queryByText("Loading news...")).not.toBeInTheDocument();
    });

    it("should not re-fetch news when collapsing an already-expanded stock", async () => {
      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      const card = cardFor("AAPL");

      await user.click(within(card).getByRole("button", { name: "Show News" }));
      fetchStockNews.mockClear();
      await user.click(within(card).getByRole("button", { name: "Hide News" }));

      expect(fetchStockNews).not.toHaveBeenCalled();
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

    it("should reveal news as soon as the response resolves, even if nothing else triggers a re-render (issue #2, fixed)", async () => {
      // No other effect resolves in this test, so the news panel can only
      // update if setStockNews itself causes a re-render.
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

      expect(
        await within(card).findByText("AAPL Reports Strong Q4 Earnings"),
      ).toBeInTheDocument();
      expect(within(card).queryByText("Loading news...")).not.toBeInTheDocument();
    });

    it("should keep a previously loaded stock's news in state after news for a different stock resolves", async () => {
      fetchStockNews.mockImplementation((symbol) =>
        Promise.resolve([
          { id: 1, title: `${symbol} headline`, date: "2026-01-20", summary: "..." },
        ]),
      );

      const user = userEvent.setup();

      render(<StockList stocks={stocks} searchTerm="" />);

      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Show News" }));
      await within(cardFor("AAPL")).findByText("AAPL headline");

      // Make any further fetch hang, so re-expanding AAPL below can only be
      // showing data still sitting in state from its first load, not a
      // fresh response.
      fetchStockNews.mockReturnValue(new Promise(() => {}));

      await user.click(within(cardFor("NVDA")).getByRole("button", { name: "Show News" }));
      await user.click(within(cardFor("AAPL")).getByRole("button", { name: "Show News" }));

      expect(within(cardFor("AAPL")).getByText("AAPL headline")).toBeInTheDocument();
    });

  });
});
