import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import SearchBar from "./SearchBar";

// Regression coverage for SearchBar's suggestions lifecycle, including the
// fixes for issues #10, #18 and #19 (docs/known-issues.md): suggestions are
// derived synchronously from the `stocks` prop App already loaded (no more
// independent fetch), close on pick, and hide once the query drops back to
// the threshold.

const mockStocks = [
  { id: 1, symbol: "AAPL", name: "Apple Inc." },
  { id: 2, symbol: "AAAA", name: "Amazing Company" },
];

function getInput() {
  return screen.getByPlaceholderText("Search stocks...");
}

describe("SearchBar", () => {
  it("should render a text input with the given placeholder", () => {
    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    const input = getInput();

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("");
  });

  it("should render no suggestions list before the user types anything", () => {
    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should call onSearch synchronously on every keystroke", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <SearchBar onSearch={onSearch} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "am");

    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenNthCalledWith(1, "a");
    expect(onSearch).toHaveBeenNthCalledWith(2, "am");
  });

  it("should update the input's own value as the user types", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "amaz");

    expect(getInput()).toHaveValue("amaz");
  });

  it("should call onSearch with an empty string once the input is cleared", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <SearchBar onSearch={onSearch} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "am");
    await user.clear(getInput());

    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("should not show suggestions while the query is 2 characters or fewer", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "am");

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should render matching suggestions the instant the query exceeds 2 characters, straight from the stocks prop (issue #10, fixed)", () => {
    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    // fireEvent, not userEvent: the assertion below runs before any
    // microtask could flush, so this only passes if the suggestion came
    // straight from the `stocks` prop already in memory - proving there is
    // no fetch of SearchBar's own in between.
    fireEvent.change(getInput(), { target: { value: "ama" } });

    expect(screen.getByText("Amazing Company")).toBeInTheDocument();
    expect(screen.queryByText("Apple Inc.")).not.toBeInTheDocument();
  });

  it("should match suggestions case-insensitively against the company name", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "AMA");

    expect(screen.getByText("Amazing Company")).toBeInTheDocument();
  });

  it("should match suggestions only against the company name, not the ticker symbol (existing behavior)", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    // "aaaa" is Amazing Company's symbol (AAAA), but is not a substring of
    // its name "Amazing Company" - so this produces zero suggestions.
    await user.type(getInput(), "aaaa");

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should recompute suggestions against the stocks prop on every keystroke past the threshold", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "amazi");

    expect(screen.getByText("Amazing Company")).toBeInTheDocument();
  });

  it("should render one clickable suggestion per matching stock", async () => {
    const stocks = [
      { id: 1, symbol: "AAPL", name: "Apple Inc." },
      { id: 2, symbol: "AMZN", name: "Amazon.com Inc." },
    ];

    const user = userEvent.setup();

    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={stocks} />);

    await user.type(getInput(), "inc");

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("should fill the input and report the suggestion through onSearch when clicked", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <SearchBar onSearch={onSearch} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "ama");

    const suggestion = screen.getByText("Amazing Company");

    await user.click(suggestion);

    expect(getInput()).toHaveValue("Amazing Company");
    expect(onSearch).toHaveBeenLastCalledWith("Amazing Company");
  });

  it("should close the suggestions list after a suggestion is clicked (issue #18, fixed)", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "ama");

    const suggestion = screen.getByText("Amazing Company");

    await user.click(suggestion);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should hide the suggestions once the query is cleared back to the threshold (issue #19, fixed)", async () => {
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />,
    );

    await user.type(getInput(), "ama");
    screen.getByText("Amazing Company");
    await user.clear(getInput());

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should close the suggestions list when clicking outside the search bar, without changing the query (issue #23, fixed)", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <SearchBar onSearch={() => {}} placeholder="Search stocks..." stocks={mockStocks} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.type(getInput(), "ama");
    screen.getByText("Amazing Company");

    await user.click(screen.getByText("Outside"));

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(getInput()).toHaveValue("ama");
  });
});
