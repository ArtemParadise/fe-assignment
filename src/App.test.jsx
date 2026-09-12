import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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
  default: ({ stocks, searchTerm }) => (
    <div>
      <span>stocks:{stocks.length}</span>
      <span>term:{searchTerm}</span>
    </div>
  ),
}));

const stocks = [
  { id: 1, symbol: "AAPL", name: "Apple Inc." },
  { id: 5, symbol: "TSLA", name: "Tesla Inc." },
];

// App fetches stock data on mount, and that mocked promise resolves on a
// later microtask than a synchronous test body. Flushing it under act()
// here keeps that resulting setState from being reported as an unwrapped
// update in tests that don't otherwise await the fetch.
async function flushGenerateStockData() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("App", () => {
  beforeEach(() => {
    generateStockData.mockReset().mockResolvedValue(stocks);
  });

  it("should render the dashboard heading", async () => {
    render(<App />);
    await flushGenerateStockData();

    expect(
      screen.getByRole("heading", { name: "Stock Trading Dashboard" }),
    ).toBeInTheDocument();
  });

  it("should render SearchBar with the dashboard's search placeholder", async () => {
    render(<App />);
    await flushGenerateStockData();

    expect(screen.getByPlaceholderText("Search stocks...")).toBeInTheDocument();
  });

  it("should pass an empty stock list to StockList before the fetch resolves", () => {
    generateStockData.mockReturnValue(new Promise(() => {}));
    render(<App />);

    expect(screen.getByText("stocks:0")).toBeInTheDocument();
  });

  it("should fetch stock data on mount and pass it down to StockList once resolved", async () => {
    render(<App />);

    expect(await screen.findByText("stocks:2")).toBeInTheDocument();
  });

  it("should pass the search term typed into SearchBar down to StockList", async () => {
    render(<App />);
    await screen.findByText("stocks:2");

    fireEvent.change(screen.getByPlaceholderText("Search stocks..."), {
      target: { value: "AAPL" },
    });

    expect(await screen.findByText("term:AAPL")).toBeInTheDocument();
  });
});
