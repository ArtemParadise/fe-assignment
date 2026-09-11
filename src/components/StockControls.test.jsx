import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import StockControls from "./StockControls";

// Moved from StockList.test.jsx as part of extracting StockControls: this
// assertion is purely about what StockControls renders given its `sectors`
// prop, so it's driven directly against the component. Running it here
// after the extraction is what confirms the extraction didn't change
// StockControls's observable output.

function renderControls(overrides = {}) {
  const props = {
    sortBy: "symbol",
    sortOrder: "asc",
    onSort: vi.fn(),
    sectors: ["Automotive", "Technology"],
    filterBySector: "",
    onFilterBySectorChange: vi.fn(),
    ...overrides,
  };

  render(<StockControls {...props} />);

  return props;
}

describe("StockControls", () => {
  it("should list 'All Sectors' plus every unique sector as options", () => {
    renderControls();

    const options = within(screen.getByRole("combobox")).getAllByRole("option");

    expect(options.map((o) => o.textContent)).toEqual([
      "All Sectors",
      "Automotive",
      "Technology",
    ]);
  });
});
