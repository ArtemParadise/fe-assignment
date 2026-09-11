import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "./SearchBar";
import { generateStockData } from "../utils/mockStockApi";

// Baseline for the upcoming refactor: locks down SearchBar's current,
// observable behavior (including its existing quirks) so a regression can
// be told apart from a deliberate, documented improvement.

vi.mock("../utils/mockStockApi", () => ({
  generateStockData: vi.fn(),
}));

const mockStocks = [
  { id: 1, symbol: "AAPL", name: "Apple Inc." },
  { id: 2, symbol: "AAAA", name: "Amazing Company" },
];

function getInput() {
  return screen.getByPlaceholderText("Search stocks...");
}

describe("SearchBar", () => {
  beforeEach(() => {
    generateStockData.mockReset();
    generateStockData.mockResolvedValue(mockStocks);
  });

  it("should render a text input with the given placeholder", () => {
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    const input = getInput();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("");
  });

  it("should render no suggestions list before the user types anything", () => {
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should call onSearch synchronously on every keystroke", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Search stocks..." />);

    await user.type(getInput(), "am");

    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenNthCalledWith(1, "a");
    expect(onSearch).toHaveBeenNthCalledWith(2, "am");
  });

  it("should update the input's own value as the user types", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "amaz");

    expect(getInput()).toHaveValue("amaz");
  });

  it("should call onSearch with an empty string once the input is cleared", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Search stocks..." />);

    await user.type(getInput(), "am");
    await user.clear(getInput());

    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("should not fetch suggestions while the query is 2 characters or fewer", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "am");

    expect(generateStockData).not.toHaveBeenCalled();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should fetch and render matching suggestions once the query exceeds 2 characters", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "ama");

    expect(generateStockData).toHaveBeenCalled();
    expect(await screen.findByText("Amazing Company")).toBeInTheDocument();
    expect(screen.queryByText("Apple Inc.")).not.toBeInTheDocument();
  });

  it("should match suggestions case-insensitively against the company name", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "AMA");

    expect(await screen.findByText("Amazing Company")).toBeInTheDocument();
  });

  it("should match suggestions only against the company name, not the ticker symbol (existing behavior)", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    // "zzzz" is Amazing Company's symbol, not part of its name, and matches
    // no other field - so today it produces zero suggestions.
    await user.type(getInput(), "zzzz");
    await waitFor(() => expect(generateStockData).toHaveBeenCalled());

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should re-fetch suggestions on every keystroke past the threshold, once per keystroke (existing behavior, duplicates App's own fetch)", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "amazi");

    // "ama", "amaz", "amazi" each independently call generateStockData.
    expect(generateStockData).toHaveBeenCalledTimes(3);
  });

  it("should render one clickable suggestion per matching stock", async () => {
    generateStockData.mockResolvedValue([
      { id: 1, symbol: "AAPL", name: "Apple Inc." },
      { id: 2, symbol: "AMZN", name: "Amazon.com Inc." },
    ]);
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "inc");

    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
  });

  it("should fill the input and report the suggestion through onSearch when clicked", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Search stocks..." />);

    await user.type(getInput(), "ama");
    const suggestion = await screen.findByText("Amazing Company");
    await user.click(suggestion);

    expect(getInput()).toHaveValue("Amazing Company");
    expect(onSearch).toHaveBeenLastCalledWith("Amazing Company");
  });

  it("should leave the suggestions list open after a suggestion is clicked (existing behavior)", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "ama");
    const suggestion = await screen.findByText("Amazing Company");
    await user.click(suggestion);

    expect(screen.getByText("Amazing Company")).toBeInTheDocument();
  });

  it("should keep showing the last suggestions after the query is cleared, instead of hiding them (existing behavior)", async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={() => {}} placeholder="Search stocks..." />);

    await user.type(getInput(), "ama");
    await screen.findByText("Amazing Company");
    await user.clear(getInput());

    expect(screen.getByText("Amazing Company")).toBeInTheDocument();
  });
});
