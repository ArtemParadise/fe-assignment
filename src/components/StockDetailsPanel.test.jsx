import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import StockDetailsPanel from "./StockDetailsPanel";

// Moved from StockList.test.jsx as part of extracting StockDetailsPanel:
// this assertion is purely about what StockDetailsPanel renders given its
// `details` prop, so it's driven directly against the component. Running
// it here after the extraction is what confirms the extraction didn't
// change StockDetailsPanel's observable output.

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

describe("StockDetailsPanel", () => {
  it("should render every field of the resolved details panel, correctly formatted", () => {
    render(
      <StockDetailsPanel
        loading={false}
        details={aaplDetails}
        priceHistory={null}
        priceHistoryLoading={false}
        onLoadPriceHistory={vi.fn()}
      />,
    );

    expect(screen.getByText("Stock Details - AAPL")).toBeInTheDocument();
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

  it("should not render a price history list before it's been requested", () => {
    render(
      <StockDetailsPanel
        loading={false}
        details={aaplDetails}
        priceHistory={null}
        priceHistoryLoading={false}
        onLoadPriceHistory={vi.fn()}
      />,
    );

    expect(screen.queryByRole("list", { name: "Price history" })).not.toBeInTheDocument();
  });

  it("should show a loading indicator while price history is being fetched", () => {
    render(
      <StockDetailsPanel
        loading={false}
        details={aaplDetails}
        priceHistory={null}
        priceHistoryLoading={true}
        onLoadPriceHistory={vi.fn()}
      />,
    );

    expect(screen.getByText("Loading price history...")).toBeInTheDocument();
  });

  it("should render the fetched price history once loaded (issue #16, fixed)", () => {
    render(
      <StockDetailsPanel
        loading={false}
        details={aaplDetails}
        priceHistory={[
          { date: "2026-01-01", price: "195.50" },
          { date: "2026-01-02", price: "197.25" },
        ]}
        priceHistoryLoading={false}
        onLoadPriceHistory={vi.fn()}
      />,
    );

    const list = screen.getByRole("list", { name: "Price history" });

    expect(within(list).getByText("2026-01-01: $195.50")).toBeInTheDocument();
    expect(within(list).getByText("2026-01-02: $197.25")).toBeInTheDocument();
  });

  it("should call onLoadPriceHistory when the button is clicked", async () => {
    const user = userEvent.setup();
    const onLoadPriceHistory = vi.fn();

    render(
      <StockDetailsPanel
        loading={false}
        details={aaplDetails}
        priceHistory={null}
        priceHistoryLoading={false}
        onLoadPriceHistory={onLoadPriceHistory}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Load Price History" }));

    expect(onLoadPriceHistory).toHaveBeenCalledTimes(1);
  });
});
