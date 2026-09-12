import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import StockCard from "./StockCard";

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

function getCard() {
  return screen.getByRole("heading", { level: 3 }).closest(".user-card");
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

  it("should show 'Loading...' for avg price until it is provided", () => {
    renderCard({ avgPrice: undefined });

    expect(screen.getByText("Avg: Loading...")).toBeInTheDocument();
  });

  it("should show the formatted avg price once it is provided", () => {
    renderCard({ avgPrice: 150 });

    expect(screen.getByText("Avg: 150.00")).toBeInTheDocument();
  });

  it("should render an empty star and an 'Add ... to watchlist' label by default", () => {
    renderCard({ isWatchlisted: false });

    expect(
      screen.getByRole("button", { name: "Add AAPL to watchlist" }),
    ).toHaveTextContent("☆");
  });

  it("should render a filled star and a 'Remove ... from watchlist' label when watchlisted", () => {
    renderCard({ isWatchlisted: true });

    expect(
      screen.getByRole("button", { name: "Remove AAPL from watchlist" }),
    ).toHaveTextContent("★");
  });

  it("should call onToggleWatchlist when the star button is clicked", async () => {
    const user = userEvent.setup();
    const { onToggleWatchlist } = renderCard();

    await user.click(screen.getByRole("button", { name: "Add AAPL to watchlist" }));

    expect(onToggleWatchlist).toHaveBeenCalledTimes(1);
  });

  it("should add a 'favorite' class to a watchlisted card", () => {
    renderCard({ isWatchlisted: true });

    expect(getCard()).toHaveClass("favorite");
  });

  it("should bold the change percentage on a watchlisted card", () => {
    renderCard({ isWatchlisted: true });

    expect(screen.getByText("+2.30%")).toHaveStyle({ fontWeight: "bold" });
  });
});
