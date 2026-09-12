import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useStockDetails } from "../hooks/useStockDetails";
import { useStockFilters } from "../hooks/useStockFilters";
import { useStockMetrics } from "../hooks/useStockMetrics";
import { useStockNews } from "../hooks/useStockNews";
import { useStockSort } from "../hooks/useStockSort";
import { useWatchlist } from "../hooks/useWatchlist";

import StockList from "./StockList";

vi.mock("../hooks/useStockDetails");
vi.mock("../hooks/useStockFilters");
vi.mock("../hooks/useStockMetrics");
vi.mock("../hooks/useStockNews");
vi.mock("../hooks/useStockSort");
vi.mock("../hooks/useWatchlist");

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

function cardFor(symbol) {
  return screen.getByRole("heading", { level: 3, name: symbol }).closest(".user-card");
}

function setupHooks(overrides = {}) {
  useWatchlist.mockReturnValue({
    watchlist: [],
    toggleWatchlist: vi.fn(),
    ...overrides.watchlist,
  });
  useStockNews.mockReturnValue({
    stockNews: {},
    expandedStock: null,
    loadStockNews: vi.fn(),
    ...overrides.news,
  });
  useStockMetrics.mockReturnValue(overrides.metrics ?? {});
  useStockDetails.mockReturnValue({
    stockDetails: null,
    loading: false,
    priceHistory: null,
    priceHistoryLoading: false,
    viewStockDetails: vi.fn(),
    loadPriceHistory: vi.fn(),
    ...overrides.details,
  });
  useStockFilters.mockReturnValue({
    visibleStocks: stocks,
    filterBySector: "",
    setFilterBySector: vi.fn(),
    uniqueSectors: ["Automotive", "Technology"],
    ...overrides.filters,
  });
  useStockSort.mockReturnValue({
    sortedStocks: stocks,
    sortBy: "symbol",
    sortOrder: "asc",
    handleSort: vi.fn(),
    ...overrides.sort,
  });
}

describe("StockList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHooks();
  });

  it("renders one card per stock, in the order returned by useStockSort", () => {
    setupHooks({ sort: { sortedStocks: [stocks[1], stocks[0]] } });

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(
      screen.queryAllByRole("heading", { level: 3 }).map((el) => el.textContent),
    ).toEqual(["AAPL", "TSLA"]);
  });

  it("shows the count of sortedStocks in the heading", () => {
    setupHooks({ sort: { sortedStocks: [stocks[0]] } });

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(screen.getByText("Stocks (1)")).toBeInTheDocument();
  });

  it("passes the stocks and searchTerm props through to useStockFilters", () => {
    render(<StockList stocks={stocks} searchTerm="aapl" />);

    expect(useStockFilters).toHaveBeenCalledWith(stocks, "aapl");
  });

  it("sorts on useStockFilters' visibleStocks combined with useStockMetrics' output", () => {
    const visibleStocks = [stocks[1]];
    const metrics = { 1: { avgPrice: 100 } };

    setupHooks({ filters: { visibleStocks }, metrics });

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(useStockSort).toHaveBeenCalledWith(visibleStocks, metrics);
  });

  it("wires the sort buttons to handleSort and reflects the active field's order", async () => {
    const handleSort = vi.fn();

    setupHooks({ sort: { sortBy: "price", sortOrder: "desc", handleSort } });

    const user = userEvent.setup();

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(screen.getByRole("button", { name: "Price ↓" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Volume/ }));

    expect(handleSort).toHaveBeenCalledWith("volume");
  });

  it("wires the sector select to setFilterBySector and lists useStockFilters' sectors", async () => {
    const setFilterBySector = vi.fn();

    setupHooks({ filters: { uniqueSectors: ["Automotive"], setFilterBySector } });

    const user = userEvent.setup();

    render(<StockList stocks={stocks} searchTerm="" />);

    await user.selectOptions(screen.getByRole("combobox"), "Automotive");

    expect(setFilterBySector).toHaveBeenCalledWith("Automotive");
  });

  it("passes each stock's watchlist state to its card and toggles the clicked stock's id", async () => {
    const toggleWatchlist = vi.fn();

    setupHooks({ watchlist: { watchlist: [1], toggleWatchlist } }); // AAPL (id 1) watchlisted

    const user = userEvent.setup();

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(
      within(cardFor("AAPL")).getByRole("button", { name: "Remove AAPL from watchlist" }),
    ).toBeInTheDocument();

    await user.click(within(cardFor("TSLA")).getByRole("button", { name: "Add TSLA to watchlist" }));

    expect(toggleWatchlist).toHaveBeenCalledWith(5);
  });

  it("passes each stock's computed avg price from useStockMetrics to its card", () => {
    setupHooks({ metrics: { 1: { avgPrice: 150 } } });

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(within(cardFor("AAPL")).getByText("Avg: 150.00")).toBeInTheDocument();
    expect(within(cardFor("TSLA")).getByText("Avg: Loading...")).toBeInTheDocument();
  });

  it("passes each stock's news state to its card and requests news for the clicked stock", async () => {
    const loadStockNews = vi.fn();

    setupHooks({
      news: {
        loadStockNews,
        expandedStock: "AAPL",
        stockNews: { AAPL: [{ id: 1, title: "Headline", date: "2026-01-20", summary: "..." }] },
      },
    });

    const user = userEvent.setup();

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(within(cardFor("AAPL")).getByText("Headline")).toBeInTheDocument();

    await user.click(within(cardFor("TSLA")).getByRole("button", { name: "Show News" }));

    expect(loadStockNews).toHaveBeenCalledWith("TSLA");
  });

  it("requests details for the clicked stock and renders the resolved panel from useStockDetails", async () => {
    const viewStockDetails = vi.fn();

    setupHooks({ details: { viewStockDetails, stockDetails: aaplDetails } });

    const user = userEvent.setup();

    render(<StockList stocks={stocks} searchTerm="" />);

    expect(screen.getByText("Stock Details - AAPL")).toBeInTheDocument();

    await user.click(within(cardFor("TSLA")).getByRole("button", { name: "View Details" }));

    expect(viewStockDetails).toHaveBeenCalledWith("TSLA");
  });

  it("wires the 'Load Price History' button to loadPriceHistory", async () => {
    const loadPriceHistory = vi.fn();

    setupHooks({ details: { stockDetails: aaplDetails, loadPriceHistory } });

    const user = userEvent.setup();

    render(<StockList stocks={stocks} searchTerm="" />);

    await user.click(screen.getByRole("button", { name: "Load Price History" }));

    expect(loadPriceHistory).toHaveBeenCalledTimes(1);
  });
});
