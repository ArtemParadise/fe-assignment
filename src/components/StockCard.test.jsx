import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import StockCard from "./StockCard";

// Moved from StockList.test.jsx as part of extracting StockCard: these
// assertions are purely about what StockCard renders given its props, so
// they're driven directly against the component instead of through
// StockList + mocked API calls. Running them here after the extraction is
// what confirms the extraction didn't change StockCard's observable output.

const aapl = {
  id: 1,
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 178.52,
  sector: "Technology",
  change: 2.3,
  volume: 52000000,
};

const tsla = {
  id: 5,
  symbol: "TSLA",
  name: "Tesla Inc.",
  price: 238.45,
  sector: "Automotive",
  change: -3.4,
  volume: 98000000,
};

function renderCard(overrides = {}) {
  const props = {
    stock: aapl,
    isWatchlisted: false,
    avgPrice: undefined,
    news: [],
    isExpanded: false,
    onToggleWatchlist: vi.fn(),
    onViewDetails: vi.fn(),
    onToggleNews: vi.fn(),
    ...overrides,
  };

  render(<StockCard {...props} />);

  return props;
}

describe("StockCard", () => {
  it("should render the company name, formatted price, sector, and volume in millions", () => {
    renderCard();

    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("$178.52")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("Volume: 52.0M")).toBeInTheDocument();
  });

  it("should prefix a positive change with a '+' sign and render it in green", () => {
    renderCard({ stock: aapl });

    expect(screen.getByText("+2.30%")).toHaveStyle({ color: "rgb(0, 128, 0)" });
  });

  it("should render a negative change without a leading sign and in red", () => {
    renderCard({ stock: tsla });

    expect(screen.getByText("-3.40%")).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("should show only the first 3 articles, each truncated to 80 characters with an ellipsis", async () => {
    const news = [
      { id: 1, title: "One", date: "2026-01-01", summary: "a".repeat(100) },
      { id: 2, title: "Two", date: "2026-01-02", summary: "b".repeat(100) },
      { id: 3, title: "Three", date: "2026-01-03", summary: "c".repeat(100) },
      { id: 4, title: "Four", date: "2026-01-04", summary: "d".repeat(100) },
    ];

    renderCard({ isExpanded: true, news });

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.queryByText("Four")).not.toBeInTheDocument();
    expect(screen.getByText(`${"a".repeat(80)}...`)).toBeInTheDocument();
  });
});
