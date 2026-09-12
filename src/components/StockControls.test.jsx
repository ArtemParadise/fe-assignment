import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import StockControls from "./StockControls";

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

  it("should show an ascending arrow on the active sort button and no arrow on the rest", () => {
    renderControls({ sortBy: "price", sortOrder: "asc" });

    expect(screen.getByRole("button", { name: "Price ↑" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Symbol" })).toBeInTheDocument();
  });

  it("should show a descending arrow on the active sort button when sortOrder is 'desc'", () => {
    renderControls({ sortBy: "price", sortOrder: "desc" });

    expect(screen.getByRole("button", { name: "Price ↓" })).toBeInTheDocument();
  });

  it("should call onSort with the clicked field", async () => {
    const user = userEvent.setup();
    const { onSort } = renderControls();

    await user.click(screen.getByRole("button", { name: /^Volume/ }));

    expect(onSort).toHaveBeenCalledWith("volume");
  });

  it("should call onFilterBySectorChange with the selected sector", async () => {
    const user = userEvent.setup();
    const { onFilterBySectorChange } = renderControls();

    await user.selectOptions(screen.getByRole("combobox"), "Automotive");

    expect(onFilterBySectorChange).toHaveBeenCalledWith("Automotive");
  });
});
