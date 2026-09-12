import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import StockNews from "./StockNews";

const articles = [
  { id: 1, title: "One", date: "2026-01-01", summary: "a".repeat(100) },
  { id: 2, title: "Two", date: "2026-01-02", summary: "b".repeat(100) },
  { id: 3, title: "Three", date: "2026-01-03", summary: "c".repeat(100) },
  { id: 4, title: "Four", date: "2026-01-04", summary: "d".repeat(100) },
];

describe("StockNews", () => {
  it("should show a loading message while no news entry has arrived yet", () => {
    render(<StockNews news={undefined} />);

    expect(screen.getByText("Loading news...")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should say there is no news when the response settled empty (issue #27, fixed)", () => {
    render(<StockNews news={[]} />);

    expect(screen.getByText("No news available.")).toBeInTheDocument();
    expect(screen.queryByText("Loading news...")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should render an article's title and date", () => {
    render(<StockNews news={[articles[0]]} />);

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
  });

  it("should truncate a summary to 80 characters and append an ellipsis", () => {
    render(<StockNews news={[articles[0]]} />);

    expect(screen.getByText(`${"a".repeat(80)}...`)).toBeInTheDocument();
  });

  it("should show only the first 3 articles", () => {
    render(<StockNews news={articles} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.queryByText("Four")).not.toBeInTheDocument();
  });

  it("should render every article when there are fewer than the limit", () => {
    render(<StockNews news={articles.slice(0, 2)} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("Loading news...")).not.toBeInTheDocument();
    expect(screen.queryByText("No news available.")).not.toBeInTheDocument();
  });
});
