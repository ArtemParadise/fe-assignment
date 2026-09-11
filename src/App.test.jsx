import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { generateStockData } from "./utils/mockStockApi";

// App is tested as a thin container here: SearchBar and StockList already
// have their own detailed test files, so both are stubbed out below and we
// verify only what App itself owns - fetching data on mount and wiring
// state between its two children.

vi.mock("./utils/mockStockApi", () => ({
  generateStockData: vi.fn(),
}));

vi.mock("./components/SearchBar", () => ({
  default: ({ onSearch, placeholder }) => (
    <input placeholder={placeholder} onChange={(e) => onSearch(e.target.value)} />
  ),
}));

vi.mock("./components/StockList", () => ({
  default: ({ stocks, filteredStocks, searchTerm }) => (
    <div>
      <span>stocks:{stocks.length}</span>
      <span>filtered:{filteredStocks.length}</span>
      <span>term:{searchTerm}</span>
    </div>
  ),
}));

const stocks = [
  { id: 1, symbol: "AAPL", name: "Apple Inc." },
  { id: 5, symbol: "TSLA", name: "Tesla Inc." },
];

describe("App", () => {
  beforeEach(() => {
    generateStockData.mockReset().mockResolvedValue(stocks);
  });

  it("should render the dashboard heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Stock Trading Dashboard" }),
    ).toBeInTheDocument();
  });

  it("should render SearchBar with the dashboard's search placeholder", () => {
    render(<App />);

    expect(screen.getByPlaceholderText("Search stocks...")).toBeInTheDocument();
  });

  it("should pass an empty stock list to StockList before the fetch resolves", () => {
    render(<App />);

    expect(screen.getByText("stocks:0")).toBeInTheDocument();
  });

  it("should fetch stock data on mount and pass it down to StockList once resolved", async () => {
    render(<App />);

    expect(await screen.findByText("stocks:2")).toBeInTheDocument();
  });

  it("should pass every stock through as filteredStocks when the search term is empty", async () => {
    render(<App />);

    expect(await screen.findByText("filtered:2")).toBeInTheDocument();
  });

  it("should pass the search term typed into SearchBar down to StockList", async () => {
    render(<App />);
    await screen.findByText("stocks:2");

    fireEvent.change(screen.getByPlaceholderText("Search stocks..."), {
      target: { value: "AAPL" },
    });

    expect(await screen.findByText("term:AAPL")).toBeInTheDocument();
  });

  it("should recompute filteredStocks by a case-sensitive name match (dead prop: StockList ignores it, see known issue #9)", async () => {
    render(<App />);
    await screen.findByText("stocks:2");

    // Unlike StockList's own filter, this one does NOT lowercase `name`
    // before comparing, so "tesla" does not match "Tesla Inc.".
    fireEvent.change(screen.getByPlaceholderText("Search stocks..."), {
      target: { value: "tesla" },
    });

    expect(await screen.findByText("filtered:0")).toBeInTheDocument();
  });

  it("should match filteredStocks by symbol via an uppercased comparison, independent of the name check's casing", async () => {
    render(<App />);
    await screen.findByText("stocks:2");

    fireEvent.change(screen.getByPlaceholderText("Search stocks..."), {
      target: { value: "aapl" },
    });

    expect(await screen.findByText("filtered:1")).toBeInTheDocument();
  });
});
