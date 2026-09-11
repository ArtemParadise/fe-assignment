# Features

Everything below was exercised in a real browser against the running dev server (not just read from source). Screenshots are in [`assets/`](./assets).

![Main dashboard](./assets/dashboard-main.png)
*The default view: 10 stock cards, sort controls, sector filter, search box.*

## 1. Stock list

A grid of 10 fixed stocks, each card showing: symbol, star (watchlist toggle), company name, price, % change (green if ≥ 0, red if negative), a sector badge, trading volume in millions, and a running average price ("Avg") computed client-side from 31 days of mock historical data fetched once per stock on load. The heading above the grid ("Stocks (N)") reflects the count *after* search + sector filtering are applied.

## 2. Search

The search box filters the grid by:
- **Symbol** — case-insensitive substring match (typing `aapl` matches `AAPL`).
- **Company name** — case-insensitive substring match (typing `apple` matches "Apple Inc.").

It does **not** match against sector — typing `tec` (a substring of "Technology") returns zero results even though 5 of the 10 stocks are in the Technology sector, because the filter only looks at `symbol` and `name`.

Independently of the main grid filtering, once the query is longer than 2 characters a typeahead dropdown appears below the input, listing company names that match — sourced from `SearchBar`'s own separate mock data fetch (see [architecture.md](./architecture.md)). Clicking a suggestion fills the input and re-triggers the search.

## 3. Sort

Six sort keys are available as buttons: Symbol, Price, Change, Volume, Sector, Avg Price. Clicking a key sorts ascending; clicking the same key again flips to descending (indicated by an arrow, e.g. "Symbol ↑" / "Symbol ↓"). Verified: clicking **Price** produces `$142.65 → $165.43 → $178.25 → $178.52 → $185.67 → $238.45 → $278.92 → $412.78 → $485.30 → $875.28`, i.e. correct ascending numeric order.

**Sorting by "Avg Price" before the per-stock averages have finished loading used to crash the app; this is now fixed** — stocks whose average hasn't loaded yet sort to the end of the list instead. See [known-issues.md](./known-issues.md) (issue #1) for the original reproduction and the fix.

## 4. Sector filter

A `<select>` restricts the grid to one sector (Technology, Consumer Cyclical, Automotive, Financial, Consumer Defensive — derived from whatever sectors exist in the current stock list). It composes with search (search is applied first) and with sort (sort is applied last).

## 5. Watchlist (star toggle)

Clicking the star (☆) on a card fills it (★) and gives the card a gold border/highlight. This is **in-memory React state only** — confirmed by:
- Reloading the page: the star and highlight are gone.
- Checking the browser directly after toggling a star: `window.localStorage.length === 0`.

This directly contradicts the root [`README.md`](../README.md)'s feature list, which advertises "Watchlist functionality with localStorage." See [known-issues.md](./known-issues.md#3-high--watchlist-does-not-persist-despite-being-documented-as-doing-so).

## 6. View Details

Clicking "View Details" on a card fetches a details record (500–2500ms simulated delay, shows a "Loading stock details..." indicator meanwhile) and renders it in a panel below the grid: company name, price, change %, volume, market cap, P/E ratio, EPS, 52-week high/low, dividend yield, beta.

The values shown are **independently randomized per request** and not tied to the summary card's numbers. Captured example for AAPL in the same session:

| | Summary card | Details panel (moments later) |
|---|---|---|
| Price | $178.52 | $302.60 |
| Change | +2.30% | +1.83% |
| Company | Apple Inc. | AAPL Corporation |

This is a property of the mock API (`fetchStockDetails` generates fresh random numbers rather than looking anything up — see [architecture.md](./architecture.md)), not a UI glitch, but it means the details panel can't currently be trusted to describe the same "stock" as the card that opened it.

![Details panel and an expanded news card](./assets/details-and-news-stuck.png)
*"Stock Details - AAPL" open at the bottom; GOOGL's news expanded above it.*

## 7. Show/Hide News

Clicking "Show News" on a card expands an inline panel with 3 mock articles (title, date, first 80 characters of a summary) under that card; the button becomes "Hide News" and toggles it closed. Content is templated per symbol (e.g. "`{SYMBOL}` Reports Strong Q4 Earnings") — it's the same 3 headlines/dates for every stock, just with the symbol substituted in.

**This panel is unreliable.** Depending on timing, it can get stuck permanently on "Loading news..." even though the data has actually arrived. Both outcomes (stuck, and eventually-displayed) were reproduced in the same session — see [known-issues.md](./known-issues.md#2-high--news-panel-can-get-permanently-stuck-on-loading-news).

## 8. Load Price History

A button inside the details panel, "Load Price History," fetches 31 days of mock price history but only `console.log`s the result — nothing is rendered in the UI. The source marks this with a `// TODO` comment, so it reads as intentionally unfinished rather than a bug.

## Responsiveness

At a 400px viewport (typical phone width), the sort-controls row overflows the container instead of wrapping, producing a horizontal scrollbar on the whole page (`document.documentElement.scrollWidth` = 528px vs. `clientWidth` = 385px, measured directly in-browser).

![Horizontal overflow at 400px width](./assets/mobile-overflow.png)
*Sort buttons run off the right edge of the viewport; the page scrolls horizontally.*
