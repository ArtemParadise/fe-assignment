import { render, screen } from "@testing-library/react";
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
});
