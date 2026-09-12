# Features

What the app does, as it behaves now. Everything below was exercised in a real browser against the running dev server, not just read from source.

This started as a baseline inventory of the original app — the point was to know exactly what I had to avoid breaking before touching anything. It's since been updated to match current behaviour. Where a feature changed, it says so and links to the issue.

## 1. Stock list

A grid of 10 fixed stocks. Each card shows: symbol, star (watchlist toggle), company name, price, % change (green if ≥ 0, red if negative), sector, trading volume in millions, and a running average price ("Avg") computed client-side from 31 days of mock historical data fetched once per stock on load. Until a stock's average arrives, the card shows "Loading..." in its place.

The heading above the grid ("Stocks (N)") reflects the count *after* search and sector filtering are applied.

## 2. Search

The search box filters the grid by:

- **Symbol** — case-insensitive substring match (typing `aapl` matches `AAPL`).
- **Company name** — case-insensitive substring match (typing `apple` matches "Apple Inc.").

It does **not** match against sector — typing `tec` (a substring of "Technology") returns zero results even though 5 of the 10 stocks are in the Technology sector, because the filter only looks at `symbol` and `name`. That's existing behaviour, left as-is.

Independently of the grid filtering, once the query is longer than 2 characters a typeahead dropdown appears below the input listing matching company names. Clicking a suggestion fills the input and re-triggers the search. The dropdown closes when you pick a suggestion, clear the query back to the threshold, or click anywhere outside the search bar.

*Changed:* suggestions used to come from a second, redundant `generateStockData()` call inside `SearchBar`; it now filters the already-loaded list passed down from `App` ([#10](./known-issues.md#issue-10-searchbar-duplicates-apps-data-fetch)). The dropdown previously stayed open in all three of those dismissal cases ([#18](./known-issues.md#issue-18-searchbars-suggestions-dropdown-never-closes-after-picking-a-suggestion), [#19](./known-issues.md#issue-19-stale-suggestions-stay-visible-after-the-search-box-is-cleared), [#23](./known-issues.md#issue-23-searchbars-suggestions-dropdown-stayed-open-when-clicking-elsewhere-on-the-page)).

## 3. Sort

Six sort keys as buttons: Symbol, Price, Change, Volume, Sector, Avg Price. Clicking a key sorts ascending; clicking the same key again flips to descending, shown by an arrow ("Symbol ↑" / "Symbol ↓"). Switching to a different key resets to ascending.

Verified: clicking **Price** produces `$142.65 → $165.43 → $178.25 → $178.52 → $185.67 → $238.45 → $278.92 → $412.78 → $485.30 → $875.28`.

*Changed:* sorting by "Avg Price" before the per-stock averages finished loading used to crash the whole app. Stocks whose average hasn't arrived now sort to the end of the list, in both directions ([#1](./known-issues.md#issue-1-sorting-by-avg-price-before-data-loads-crashes-the-app)).

## 4. Sector filter

A `<select>` restricts the grid to one sector — Technology, Consumer Cyclical, Automotive, Financial, Consumer Defensive, derived from whatever sectors exist in the current stock list. It composes with search (applied first) and sort (applied last).

## 5. Watchlist (star toggle)

Clicking the star (☆) on a card fills it (★) and gives the card a gold highlight. The watchlist is stored in `localStorage` under the key `watchlist`, so it survives a page reload.

*Changed:* this was in-memory React state only, despite the original README advertising "Watchlist functionality with localStorage" — `window.localStorage.length` was `0` immediately after toggling a star, and reloading cleared every star ([#3](./known-issues.md#issue-3-watchlist-does-not-persist-despite-being-documented-as-doing-so)).

## 6. View Details

Clicking "View Details" fetches a details record (500–2500ms simulated delay, with a "Loading stock details..." indicator meanwhile) and renders it in a panel below the grid: company name, price, change %, volume, market cap, P/E ratio, EPS, 52-week high/low, dividend yield, beta.

Clicking several stocks in quick succession always leaves the panel showing the stock you clicked last, even when an earlier request resolves after a later one ([#4](./known-issues.md#issue-4-fetchstockdetails-responses-can-arrive-out-of-order-no-request-cancellation)).

**Still open:** the values are independently randomized per request and aren't tied to the summary card's numbers. Captured for AAPL in one session:

| | Summary card | Details panel (moments later) |
|---|---|---|
| Price | $178.52 | $302.60 |
| Change | +2.30% | +1.83% |
| Company | Apple Inc. | AAPL Corporation |

This is a property of the mock API — `fetchStockDetails` generates fresh random numbers rather than looking anything up — not a UI bug, so fixing it would mean rewriting the fake data source rather than the app. Left as-is and documented ([#5](./known-issues.md#issue-5-details-panel-values-are-unrelated-to-the-summary-card-for-the-same-symbol)).

## 7. Show/Hide News

Clicking "Show News" expands an inline panel with 3 mock articles (title, date, first 80 characters of the summary) under that card. The button becomes "Hide News" and collapses the panel again, without re-fetching. Content is templated per symbol (e.g. "`{SYMBOL}` Reports Strong Q4 Earnings") — the same 3 headlines and dates for every stock with the symbol substituted in.

If a stock has no articles, or the request fails, the panel says "No news available." rather than showing a loading message.

*Changed:* the panel could get stuck permanently on "Loading news..." even after the data arrived ([#2](./known-issues.md#issue-2-news-panel-can-get-permanently-stuck-on-loading-news)), "Hide News" was a no-op that never collapsed anything ([#15](./known-issues.md#issue-15-hide-news-never-collapses-the-news-panel)), and an empty or failed response was indistinguishable from one still loading ([#27](./known-issues.md#issue-27-stockcard-treats-an-empty-news-list-as-still-loading)).

## 8. Load Price History

A button inside the details panel, "Load Price History", fetches 31 days of mock price history and renders it as a scrollable `date: $price` list, with a "Loading price history..." message while in flight. The list resets when you open a different stock's details.

*Changed:* the button fetched the data and only `console.log`-ged it — nothing appeared in the UI, so the control was dead from a user's point of view ([#16](./known-issues.md#issue-16-load-price-history-fetches-data-that-is-never-shown-anywhere)).

## Error handling

If a render error escapes anywhere in the tree, the page shows a "Something went wrong." panel with a reload button instead of going blank ([#24](./known-issues.md#issue-24-no-error-boundary-anywhere-in-the-tree)).

Failed background requests no longer strand the UI on a loading message: a stock whose metrics fail keeps showing "Avg: Loading...", news falls back to "No news available.", and the price-history indicator clears ([#26](./known-issues.md#issue-26-unhandled-promise-rejections-in-three-fetches)).

## Responsiveness

At a 400px viewport the sort-controls row wraps onto multiple lines and the page does not scroll horizontally (`scrollWidth` equals `clientWidth` at 385px).

*Changed:* the row used to overflow its container, producing a horizontal scrollbar across the whole page — 528px of content in a 385px viewport ([#6](./known-issues.md#issue-6-non-responsive-layout-causes-horizontal-page-scroll-on-narrow-viewports)).
