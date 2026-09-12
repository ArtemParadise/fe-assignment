# Known Issues

Everything here was either observed directly while driving the running app in a browser, or traced to a specific line while reading the source (usually both). This is a factual record of current behavior — it intentionally stops at "what happens and where," without proposing fixes, since that's the substance of the assignment briefs already in this repo ([`../README.md`](../README.md), [`FE Innovation Assignment.md`](./FE%20Innovation%20Assignment.md)).

Ordered roughly by impact.

## 1. Critical — ~~Sorting by "Avg Price" before data loads crashes the app~~ (Fixed)

**Where:** `src/hooks/useStockSort.js` (the `"metrics"` branch) and `src/utils/sorting.js` (`compareByAveragePrice`, extracted from that branch)

**Status: Fixed.** The comparator now reads `stockMetrics[a.id]?.avgPrice` / `stockMetrics[b.id]?.avgPrice` instead of assuming the entry exists, and applies an explicit policy for stocks whose metrics haven't loaded yet: they always sort to the end of the list, regardless of the current ascending/descending direction, rather than throwing. This mirrors the existing "Loading..." placeholder `StockCard` already shows for a missing `avgPrice`. Covered by `useStockSort.test.js > should not throw and should keep original order when sorting by average price before any metrics have loaded (fixes critical bug #1)`, `> should sort stocks with loaded metrics first and push stocks with missing metrics to the end, in both directions`, and the equivalent DOM-level test in `StockList.test.jsx > sorting > should not throw and should keep original order when sorting by average price before any metrics have loaded (fixes critical bug #1)`.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:76-78` (the `"metrics"` branch of `sortStocks`, before sorting was extracted into `useStockSort`)

```js
} else if (sortBy === "metrics") {
  const aMetric = stockMetrics[a.id].avgPrice;
  const bMetric = stockMetrics[b.id].avgPrice;
```

`stockMetrics` is populated asynchronously per stock (each takes ~800ms after mount, via the `fetchHistoricalPrices` effect). Until an entry exists for a given stock's `id`, `stockMetrics[a.id]` is `undefined`, and reading `.avgPrice` off it throws.

**Reproduced:** clicking the "Avg Price" sort button shortly after page load (before the per-stock averages have all resolved) throws, uncaught, during render:

```
TypeError: Cannot read properties of undefined (reading 'avgPrice')
    at StockList.jsx:84:44
    at Array.sort (<anonymous>)
    at sortStocks (StockList.jsx:69:30)
    at StockList (StockList.jsx:95:24)
```

There is no error boundary anywhere in the tree (`App` or `StockList`), so React unmounts the whole component tree and the page goes blank — not just the grid, the entire app, including the search box and header.

![Blank page after the crash](./assets/avgprice-sort-crash.png)

</details>

## 2. High — ~~News panel can get permanently stuck on "Loading news…"~~ (Fixed)

**Where:** `src/hooks/useStockNews.js` (`loadStockNews`, extracted from `StockList.jsx`)

**Status: Fixed.** `setStockNews` now builds a new object (`setStockNews((prev) => ({ ...prev, [symbol]: news }))`) instead of mutating and re-setting the same reference, so the news panel reliably re-renders as soon as the response resolves, regardless of whether any other state update happens to fire afterward. Covered by `StockList.test.jsx > news panel > should reveal news as soon as the response resolves, even if nothing else triggers a re-render (issue #2, fixed)` and `> should keep a previously loaded stock's news in state after news for a different stock resolves`.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:34-41`

```js
useEffect(() => {
  if (expandedStock) {
    fetchStockNews(expandedStock).then((news) => {
      stockNews[expandedStock] = news;
      setStockNews(stockNews);
    });
  }
}, [expandedStock]);
```

This mutates the existing `stockNews` object in place, then calls `setStockNews` with that _same_ object reference. React bails out of re-rendering for a state update when the new value is reference-equal (`Object.is`) to the current value — so this particular `setStockNews` call does not, by itself, cause `StockList` to re-render with the new news data.

**Observed effect is timing-dependent:**

- Clicked "Show News" in isolation (no other pending state updates): the card stayed on "Loading news..." indefinitely — the data had actually arrived (confirmed the object was mutated) but nothing triggered a re-render to display it.
- Clicked "Show News" while the unrelated `stockMetrics` effect (see issue #4) was still mid-flight, resolving stocks one by one: the news content _did_ appear, because one of those unrelated `setStockMetrics` updates happened to trigger a re-render after the mutation had already landed.

So the panel's reliability depended entirely on whether some _other_ state update happened to fire afterward — it wasn't deterministic from the user's perspective.

</details>

## 3. High — ~~Watchlist does not persist, despite being documented as doing so~~ (Fixed)

**Where:** `src/hooks/useWatchlist.js`

**Status: Fixed.** `watchlist` now initializes lazily from `localStorage` (key `"watchlist"`, JSON-encoded), falling back to `[]` if nothing is stored or the stored value isn't valid JSON, and a `useEffect` writes it back to `localStorage` on every change. Toggling a star now survives a reload. (`src/test/setup.js` now clears `localStorage` before every test, since the suite's jsdom environment persists it across tests in the same file otherwise.) Covered by `useWatchlist.test.js`'s persistence and restore-on-mount cases, and `StockList.test.jsx > watchlist > should persist the watchlist to localStorage (issue #3, fixed)` / `> should restore a previously persisted watchlist on mount (issue #3, fixed)`.

<details>
<summary>Original report</summary>

**Where:** `src/hooks/useWatchlist.js` (moved here from `StockList.jsx` during the hooks decomposition, unchanged) — `watchlist` is a plain `useState([])`; there is no `localStorage` reference anywhere in the hook (confirmed with a full-file read) or the rest of `src/`.

The root [`README.md`](../README.md) lists "Watchlist functionality with localStorage" under Application Features. In the running app:

- Toggling a star, then reloading the page, clears every star.
- `window.localStorage.length` is `0` immediately after toggling a star and checking in-browser.

The feature (the star toggle itself, and its visual highlight) works as in-memory UI state; only the persistence half described in the docs is absent.

</details>

## 4. Medium — ~~`fetchStockDetails` responses can arrive out of order (no request cancellation)~~ (Fixed)

**Where:** `src/hooks/useStockDetails.js` (`viewStockDetails`, extracted from `StockList.jsx`)

**Status: Fixed.** A `latestDetailsRequest` ref now records the symbol of the most recently clicked "View Details" request; both the resolve and the `finally` handler check that the response they're processing still matches `latestDetailsRequest.current` before calling `setStockDetails`/`setLoading(false)`. A stale, slower response for a stock that's no longer selected is now discarded instead of overwriting the panel. Covered by `StockList.test.jsx > stock details > should keep showing the most recently requested stock's details when an older, slower request resolves afterward (issue #4, fixed)`.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:20-32`, and the delay itself is described in `src/utils/mockStockApi.js:113-118`:

```js
// Simulated API with random delays causing race conditions
export const fetchStockDetails = (symbol) => {
  return new Promise((resolve) => {
    const delay = Math.random() * 2000 + 500;
    ...
```

Every click on "View Details" started a new `fetchStockDetails` call; the effect didn't track or cancel the previous in-flight request. Because each response is delayed by a random 500–2500ms, clicking stock A and then quickly clicking stock B could result in A's slower response resolving _after_ B's and overwriting the panel — so the panel could end up showing details for a stock other than the one currently selected. (The source comment above calls this out explicitly as intentional.)

</details>

## 5. Medium — Details panel values are unrelated to the summary card for the same symbol

**Where:** `src/utils/mockStockApi.js:114-135` (`fetchStockDetails`)

The function ignores the actual stock record and generates entirely new random numbers, only echoing the `symbol`/a derived name. Example captured live for AAPL: summary card showed price `$178.52` / change `+2.30%`; the details panel opened moments later showed price `$302.60` / change `1.83%` / company "AAPL Corporation" (vs. "Apple Inc." on the card). This is a property of the mock data generator rather than a rendering bug, but it means no number in the details panel can currently be cross-checked against the card that opened it.

## 6. Medium — Non-responsive layout causes horizontal page scroll on narrow viewports

**Where:** `src/App.css` — `.controls` / `.sort-controls` (`~lines 85-108`)

At a 400px viewport, `document.documentElement.scrollWidth` measures 528px against a `clientWidth` of 385px — a 143px horizontal overflow, caused by the six sort buttons not wrapping within the available width. Visible in [`assets/mobile-overflow.png`](./assets/mobile-overflow.png).

## 7. Low — Large blank gap on every stock card

**Where:** `src/App.css:177-185`

```css
.stock-name {
  color: #555;
  font-size: 13px;
  margin: 88px 0;
  ...
```

`margin: 88px 0` on `.stock-name` (the company name line, e.g. "Apple Inc.") pushes a large empty gap before the price on every card, visible in every screenshot in [features.md](./features.md). Looks like a stray/leftover value rather than an intentional design choice, given nothing else in the stylesheet uses spacing anywhere near that scale.

## 8. Low — ~~Missing `key` prop on sector `<option>` elements~~ (Fixed)

**Where:** `src/components/StockControls.jsx` (the sector `<select>`, extracted from `StockList.jsx` during the hooks/components decomposition)

**Status: Fixed.** The sector options now render as `<option key={sector} value={sector}>{sector}</option>`, so the console warning is gone. No dedicated test was added for this (a missing-`key` warning isn't something the existing test setup asserts on), but it's confirmed by reading the current component.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:154-157`

```js
{
  uniqueSectors.map((sector) => <option value={sector}>{sector}</option>);
}
```

No `key` is provided, which React flags on every render:

```
Warning: Each child in a list should have a unique "key" prop.
    at option
    at StockList (StockList.jsx:24:22)
```

</details>

## 9. Low — Dead state and props in `App.jsx` (partially fixed)

**Where:** `src/App.jsx`

**Status: Partially fixed.** The dead `showTimer` state and the dead `selectedStock` / `setActiveSelectedStockFromMarketDataRequested` write have both been removed entirely — `App.jsx` no longer declares either. The other two items are still present, unchanged:

- `filteredStocks` (`App.jsx:22-26`) is computed and passed to `<StockList filteredStocks={filteredStocks}>` (`App.jsx:36`), but `StockList`'s signature (`src/components/StockList.jsx:11`) only destructures `{ stocks, searchTerm }` — the prop is ignored, and `StockList` recomputes an equivalent list internally from `searchTerm` via `useStockFilters` (`src/hooks/useStockFilters.js`). Two implementations of the same filter still exist; only one is live.
- `config = { theme: "dark", lang: "en" }` (`App.jsx:16`) is applied as `style={config}` on the root `<div>` (`App.jsx:29`). `theme` and `lang` aren't real CSS properties, so this still has no visual effect — reads like an abandoned theming attempt.

## 10. Low — ~~`SearchBar` duplicates `App`'s data fetch~~ (Fixed)

**Where:** `src/components/SearchBar.jsx`

**Status: Fixed.** `SearchBar` now takes the already-loaded stock list as a `stocks` prop (passed down from `App`, `src/App.jsx`) and filters it directly to build suggestions, instead of calling `generateStockData()` itself. There is no fetch left in `SearchBar` at all — suggestions are derived synchronously on every keystroke past the threshold. Covered by `SearchBar.test.jsx > should render matching suggestions the instant the query exceeds 2 characters, straight from the stocks prop (issue #10, fixed)`.

<details>
<summary>Original report</summary>

**Where:** `src/components/SearchBar.jsx:14-22`

Rather than receiving the stock list `App` already loaded, `SearchBar` calls `generateStockData()` itself every time the query passes 3 characters, to build its typeahead suggestions. This is a second, independent copy of the same mock "network" call and data source.

</details>

## 11. Low — ~~List keyed by array index~~ (Fixed)

**Where:** `src/components/StockList.jsx` (the stock grid `.map`)

**Status: Fixed.** Each stock item now renders as `<div role="listitem" key={stock.id}>`, keyed by the stable underlying id instead of the array index, so it no longer misbehaves if per-card local/uncontrolled state is ever added.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:172` (`key={index}` on each stock card, inside a list that's re-sorted and re-filtered by user interaction)

Using the array index as the React key for a reorderable/filterable list is a standard anti-pattern. It doesn't currently produce a visible symptom (nothing in the card holds local component state or uncontrolled DOM state that would need to follow the underlying stock across a re-sort), but it would silently misbehave the moment any such state were added to a card.

</details>

## 12. Low — Low-contrast text in the details panel

**Where:** `src/App.css:254-260` and `src/App.css:312-314` (two separate, overlapping `.user-details p` rules)

Details-panel paragraphs render in `#999` at `11px` on a `#e9ecef` background — visibly hard to read in [`assets/details-and-news-stuck.png`](./assets/details-and-news-stuck.png). The two `.user-details p` rules (lines 254-260 and 312-314) also partially conflict: the later one in the file wins for `margin`, the earlier one wins for `color`/`font-size`/`margin-bottom` (which the later rule doesn't redeclare) — functional today only because of CSS cascade order, not because it's written to be.

## 13. Cosmetic — Missing favicon (404 on load)

**Where:** `index.html:5` references `/vite.svg`; there is no `public/` directory in the project and no `vite.svg` anywhere in the repo.

Produces a `404` in the console on every page load. No functional impact.

## 14. Low — ~~User-triggered fetches modeled as state + effect instead of event handlers~~ (Fixed)

**Where:** `src/hooks/useStockDetails.js` (`viewStockDetails`) and `src/hooks/useStockNews.js` (`loadStockNews`)

**Status: Fixed**, as a side effect of the hooks decomposition. `viewStockDetails` and `loadStockNews` now call `fetchStockDetails` / `fetchStockNews` directly from the click handler itself — neither hook has a `useEffect` watching a piece of state to trigger the fetch. (`useStockMetrics.js` still uses `useEffect`, but for the per-stock metrics fetched on mount, not for a user-triggered click — that was never part of this issue.)

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:20-32` (`[selectedStock]` effect) and `:34-41` (`[expandedStock]` effect)

Both "View Details" and "Show News" are direct click actions, but neither click handler (`setSelectedStock(stock.symbol)` / `loadStockNews` → `setExpandedStock(symbol)`) does the fetch itself. Instead, each click sets a piece of state, and a separate `useEffect` watches that state to fire the actual request. This is the "event modeled as state + effect" pattern ([react.dev: should this code move to an event handler?](https://react.dev/learn/removing-effect-dependencies#should-this-code-move-to-an-event-handler)) — it adds a layer of indirection between the click and the fetch it causes, and was part of why issues #2 and #4 above existed: it made it easy to lose track of which render cycle a given async response belongs to.

</details>

---

Issues #15-20 below turned up while writing the unit test suite (`src/**/*.test.jsx`), rather than while driving the app directly. They're appended here rather than merged into the ranked list above, to avoid renumbering entries that #14 and the details panel writeup already cross-reference by number.

## 15. Medium — ~~"Hide News" never collapses the news panel~~ (Fixed)

**Where:** `src/hooks/useStockNews.js` (`loadStockNews`, extracted from `StockList.jsx`)

**Status: Fixed.** `loadStockNews` now checks whether the clicked symbol is already the expanded one; if so it calls `setExpandedStock(null)` and returns before firing any fetch, instead of always calling `setExpandedStock(symbol)` again. Clicking "Hide News" collapses the panel and the button reverts to "Show News". Covered by `StockList.test.jsx > news panel > should collapse the panel when 'Hide News' is clicked on an already-expanded stock` and `> should not re-fetch news when collapsing an already-expanded stock`.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:116-118` (`loadStockNews`) and `:220-221` (the button)

```js
const loadStockNews = (symbol) => {
  setExpandedStock(symbol);
};
...
<button onClick={() => loadStockNews(stock.symbol)}>
  {isExpanded ? "Hide News" : "Show News"}
</button>
```

The button's label is conditional on `isExpanded`, but its `onClick` always calls `loadStockNews(stock.symbol)` — there is no branch that ever calls `setExpandedStock(null)`. Once a card's news panel is expanded, clicking "Hide News" just calls `setExpandedStock` with the _same_ symbol again (a no-op state update), so the panel never closes and the button stays reading "Hide News" for the rest of the session. Covered by `src/components/StockList.test.jsx > news panel > should not collapse the panel when 'Hide News' is clicked`.

</details>

## 16. Medium — ~~"Load Price History" fetches data that is never shown anywhere~~ (Fixed)

**Where:** `src/hooks/useStockDetails.js`, `src/components/StockDetailsPanel.jsx`

**Status: Fixed.** `loadPriceHistory` now stores the fetched prices in a `priceHistory` state (plus a `priceHistoryLoading` flag) instead of only `console.log`-ing them, and `StockDetailsPanel` renders them as a scrollable `date: $price` list once loaded (styled via the new `.price-history` rule in `src/App.css`), with a "Loading price history..." message while in flight. Both reset whenever a new stock's details are requested, and — reusing the same `latestDetailsRequestId` ref that fixed issue #4 — a price-history response for a request that's since been superseded by a different stock is discarded instead of mislabeling that stock's panel. Covered by `useStockDetails.test.js`'s price-history cases, `StockDetailsPanel.test.jsx`'s rendering/loading cases, and `StockList.test.jsx > stock details > should fetch and render historical prices when 'Load Price History' is clicked (issue #16, fixed)`.

<details>
<summary>Original report</summary>

**Where:** `src/hooks/useStockDetails.js` (`loadPriceHistory`, extracted from `StockList.jsx`)

```js
const loadPriceHistory = () => {
  fetchHistoricalPrices(stockDetails.symbol).then((prices) => {
    // eslint-disable-next-line no-console -- known issue #16 (docs/known-issues.md): result is only logged, never rendered; not fixing app bugs in this eslint cleanup
    console.log("Historical prices:", prices);
    // TODO
  });
};
```

Still not fixed — this is unchanged behavior from the original report, just relocated during the hooks decomposition, and now explicitly flagged in-code (via the `eslint-disable` comment above) as a known issue rather than something to silently clean up. Clicking the button does fire a real request, but the result only reaches `console.log` behind a `// TODO` comment — there's no state update, so nothing on screen ever changes. From a user's perspective, the button is dead: nothing visibly happens when it's clicked.

</details>

## 17. Medium — ~~`fetchStockDetails` errors are swallowed and leave the loading indicator stuck forever~~ (Fixed)

**Where:** `src/hooks/useStockDetails.js` (`viewStockDetails`, extracted from `StockList.jsx`)

**Status: Fixed.** The fetch now runs through a `.finally(() => setLoading(false))`, so the loading indicator clears whether the request succeeds or fails. Covered by `StockList.test.jsx > stock details > should log the error and clear the loading indicator if fetchStockDetails rejects (known issue #17, fixed)`.

The error is still only reported via `console.log` (not surfaced anywhere in the UI, and now marked with an `eslint-disable-next-line no-console` comment in `useStockDetails.js` that explicitly cross-references this issue), so a failed request is still silent from the user's perspective beyond the loader disappearing — only the "stuck forever" part of this issue is resolved.

<details>
<summary>Original report</summary>

**Where:** `src/components/StockList.jsx:20-32`

```js
fetchStockDetails(selectedStock)
  .then((data) => {
    setStockDetails(data);
    setLoading(false);
  })
  .catch((err) => {
    console.log(err);
  });
```

The `.catch` only logs the error — it never calls `setLoading(false)`. If `fetchStockDetails` ever rejected, "Loading stock details..." would stay on screen indefinitely with no way for the user to know the request failed. The current mock in `mockStockApi.js` never actually rejects, so this path can't be hit by driving the running app — it was only found by mocking a rejection directly in `StockList.test.jsx > stock details`.

</details>

## 18. Low — ~~`SearchBar`'s suggestions dropdown never closes after picking a suggestion~~ (Fixed)

**Where:** `src/components/SearchBar.jsx`

**Status: Fixed.** Picking a suggestion now calls `setSuggestionsVisible(false)` alongside updating the input and reporting the value via `onSearch`, so the dropdown closes immediately after a selection. Covered by `SearchBar.test.jsx > should close the suggestions list after a suggestion is clicked (issue #18, fixed)`.

<details>
<summary>Original report</summary>

**Where:** `src/components/SearchBar.jsx:48-55`

```js
onClick={() => {
  setValue(item.name);
  onSearch(item.name);
}}
```

Selecting a suggestion updates the input and reports the value via `onSearch`, but never calls `setSuggestions([])`. The (now stale) suggestions list stays open underneath the input after a selection.

</details>

## 19. Low — ~~Stale suggestions stay visible after the search box is cleared~~ (Fixed)

**Where:** `src/components/SearchBar.jsx` (`handleChange`)

**Status: Fixed.** As part of the same fix as issues #10 and #18, suggestions are no longer independent state populated by a fetch — they're derived on every render from the current query and a `suggestionsVisible` flag that `handleChange` sets to `newValue.length > 2` on every keystroke. Clearing the input (or shrinking the query back to the threshold) now hides the dropdown immediately, with no stale state left behind to render. Covered by `SearchBar.test.jsx > should hide the suggestions once the query is cleared back to the threshold (issue #19, fixed)`.

<details>
<summary>Original report</summary>

**Where:** `src/components/SearchBar.jsx:9-23` (`handleChange`)

`setSuggestions` is only ever called inside the `newValue.length > 2` branch. Clearing the input back to an empty string skips that branch entirely, so whatever suggestions were showing before the clear stay rendered, now disconnected from the (empty) query in the box.

</details>

## 20. Low — Dead `sortBy === "name"` branch in the sort comparators

**Where:** `src/constants/sorting.js` (`SORT_COMPARATORS[SORT_FIELDS.NAME]`, moved here from the inline `sortStocks` in `StockList.jsx` during the hooks decomposition)

```js
export const SORT_FIELDS = {
  SYMBOL: "symbol",
  NAME: "name",
  ...
};

export const SORT_COMPARATORS = {
  ...
  [SORT_FIELDS.NAME]: (a, b) => a.name.localeCompare(b.name),
  ...
};
```

Still dead: `SORT_FIELDS.NAME` and its comparator exist, but `sortBy` is only ever set by `useStockSort`'s `handleSort`, which is only ever called from the six sort buttons `StockControls.jsx` renders (Symbol, Price, Change, Volume, Sector, Avg Price) — none of them pass `SORT_FIELDS.NAME`. This branch can't be reached through the UI at all; it's the same flavor of dead code as the `filteredStocks`/`config` leftovers now noted in issue #9, just in the sorting module instead of `App`.

## 21. Low — ~~`formatVolumeInMillions` renders `NaNM`, or silently shows `null` volume as `0.0M`~~ (Fixed)

**Where:** `src/utils/formatters.js` (`formatVolumeInMillions`), `src/components/StockCard.jsx:58`, `src/components/StockDetailsPanel.jsx:15`

**Status: Fixed.** `formatVolumeInMillions` is now a pure numeric conversion: it rejects any `volume` that isn't a finite `number` (covers `undefined`, `null`, non-numeric values, `NaN`, and `Infinity`) and returns `null` instead of dividing it, or the volume in millions as a plain `number` otherwise. Display formatting (decimal places, the `M` suffix, and an `"N/A"` fallback for `null`) now lives in a separate `formatVolumeLabel` helper. Both call sites used to append a literal `M` after `formatVolumeInMillions`'s return value in JSX, which would have turned an `"N/A"`-style fallback into `"N/AM"`; `StockCard` and `StockDetailsPanel` now call `formatVolumeLabel` directly instead, so missing/invalid volume renders a plain `"N/A"`. Covered by `formatters.test.js`'s cases for both functions.

<details>
<summary>Original report</summary>

**Where:** `src/utils/formatters.js:1-3`, consumed by `src/components/StockCard.jsx:58` (`stock.volume`) and `src/components/StockDetailsPanel.jsx:15` (`details.volume`)

```js
export function formatVolumeInMillions(volume, decimals = 1) {
  return (volume / 1000000).toFixed(decimals);
}
```

Two distinct symptoms from the same missing validation: an `undefined` or non-numeric `volume` divides to `NaN`, and `toFixed` on `NaN` returns the string `"NaN"`, which both call sites render as `"NaNM"` (they append the `M` suffix literally in JSX). Separately, a `null` volume divides to `0` via JS's implicit coercion, so it silently formats as `"0.0"` — indistinguishable from a stock whose volume is genuinely zero, rather than one whose volume is simply missing.

</details>

## 22. Cosmetic — Volume and Avg Price run together with no spacing on the stock card

**Where:** `src/components/StockCard.jsx:58-59` (the two `<small>` elements) and `src/App.css:205-214` (`.user-stats`)

```js
<div className="user-stats">
  <small>Volume: {formatVolumeLabel(stock.volume)}</small>
  <small>Avg: {avgPrice?.toFixed(2) || "Loading..."}</small>
</div>
```

`<small>` is an inline element, and `.user-stats` sets no `display`/`gap`/margin between its children, so the two lines butt up against each other with no separator — rendering as e.g. `Volume: 7.0MAvg: 192.91` instead of two visually distinct stats. Confirmed live in the running app.

## 23. Low — ~~`SearchBar`'s suggestions dropdown stayed open when clicking elsewhere on the page~~ (Fixed)

**Where:** `src/components/SearchBar.jsx`

Turned up while extending the suggestions-lifecycle test coverage for issues #10/#18/#19: the dropdown only ever closed when a suggestion was picked or the query dropped back to the threshold. Clicking anywhere else on the page while it was open (the stock grid, the heading, empty space) left it floating open indefinitely, disconnected from focus.

**Status: Fixed.** `SearchBar` holds a `ref` on its container and passes it, together with a callback that closes the dropdown, to a new reusable `useClickOutside` hook (`src/hooks/useClickOutside.js`). The hook only attaches its `mousedown` listener on `document` while the dropdown is visible (an `enabled` argument), and removes it on cleanup; a click whose target falls outside the ref'd container invokes the callback. The query and input value are untouched — only the dropdown closes. Covered by `SearchBar.test.jsx > should close the suggestions list when clicking outside the search bar, without changing the query (issue #23, fixed)` and, at the unit level, `useClickOutside.test.js`.
