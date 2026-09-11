# Known Issues

Everything here was either observed directly while driving the running app in a browser, or traced to a specific line while reading the source (usually both). This is a factual record of current behavior — it intentionally stops at "what happens and where," without proposing fixes, since that's the substance of the assignment briefs already in this repo ([`../README.md`](../README.md), [`FE Innovation Assignment.md`](./FE%20Innovation%20Assignment.md)).

Ordered roughly by impact.

## 1. Critical — Sorting by "Avg Price" before data loads crashes the app

**Where:** `src/components/StockList.jsx:76-78` (the `"metrics"` branch of `sortStocks`)

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

## 2. High — ~~News panel can get permanently stuck on "Loading news…"~~ (Fixed)

**Where:** `src/components/StockList.jsx` (`loadStockNews`)

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

This mutates the existing `stockNews` object in place, then calls `setStockNews` with that *same* object reference. React bails out of re-rendering for a state update when the new value is reference-equal (`Object.is`) to the current value — so this particular `setStockNews` call does not, by itself, cause `StockList` to re-render with the new news data.

**Observed effect is timing-dependent:**
- Clicked "Show News" in isolation (no other pending state updates): the card stayed on "Loading news..." indefinitely — the data had actually arrived (confirmed the object was mutated) but nothing triggered a re-render to display it.
- Clicked "Show News" while the unrelated `stockMetrics` effect (see issue #4) was still mid-flight, resolving stocks one by one: the news content *did* appear, because one of those unrelated `setStockMetrics` updates happened to trigger a re-render after the mutation had already landed.

So the panel's reliability depended entirely on whether some *other* state update happened to fire afterward — it wasn't deterministic from the user's perspective.

</details>

## 3. High — Watchlist does not persist, despite being documented as doing so

**Where:** `src/components/StockList.jsx` — `watchlist` is a plain `useState([])`; there is no `localStorage` reference anywhere in the file (confirmed with a full-file read) or the rest of `src/`.

The root [`README.md`](../README.md) lists "Watchlist functionality with localStorage" under Application Features. In the running app:
- Toggling a star, then reloading the page, clears every star.
- `window.localStorage.length` is `0` immediately after toggling a star and checking in-browser.

The feature (the star toggle itself, and its visual highlight) works as in-memory UI state; only the persistence half described in the docs is absent.

## 4. Medium — ~~`fetchStockDetails` responses can arrive out of order (no request cancellation)~~ (Fixed)

**Where:** `src/components/StockList.jsx` (`viewStockDetails`)

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

Every click on "View Details" started a new `fetchStockDetails` call; the effect didn't track or cancel the previous in-flight request. Because each response is delayed by a random 500–2500ms, clicking stock A and then quickly clicking stock B could result in A's slower response resolving *after* B's and overwriting the panel — so the panel could end up showing details for a stock other than the one currently selected. (The source comment above calls this out explicitly as intentional.)

</details>

## 5. Medium — Details panel values are unrelated to the summary card for the same symbol

**Where:** `src/utils/mockStockApi.js:114-135` (`fetchStockDetails`)

The function ignores the actual stock record and generates entirely new random numbers, only echoing the `symbol`/a derived name. Example captured live for AAPL: summary card showed price `$178.52` / change `+2.30%`; the details panel opened moments later showed price `$302.60` / change `1.83%` / company "AAPL Corporation" (vs. "Apple Inc." on the card). This is a property of the mock data generator rather than a rendering bug, but it means no number in the details panel can currently be cross-checked against the card that opened it.

## 6. Medium — Non-responsive layout causes horizontal page scroll on narrow viewports

**Where:** `src/App.css` — `.controls` / `.sort-controls` (`~lines 75-98`)

At a 400px viewport, `document.documentElement.scrollWidth` measures 528px against a `clientWidth` of 385px — a 143px horizontal overflow, caused by the six sort buttons not wrapping within the available width. Visible in [`assets/mobile-overflow.png`](./assets/mobile-overflow.png).

## 7. Low — Large blank gap on every stock card

**Where:** `src/App.css:167-175`

```css
.stock-name {
  color: #555;
  font-size: 13px;
  margin: 88px 0;
  ...
```

`margin: 88px 0` on `.stock-name` (the company name line, e.g. "Apple Inc.") pushes a large empty gap before the price on every card, visible in every screenshot in [features.md](./features.md). Looks like a stray/leftover value rather than an intentional design choice, given nothing else in the stylesheet uses spacing anywhere near that scale.

## 8. Low — Missing `key` prop on sector `<option>` elements

**Where:** `src/components/StockList.jsx:154-157`

```js
{uniqueSectors.map((sector) => (
  <option value={sector}>{sector}</option>
))}
```

No `key` is provided, which React flags on every render:

```
Warning: Each child in a list should have a unique "key" prop.
    at option
    at StockList (StockList.jsx:24:22)
```

## 9. Low — Dead state and props in `App.jsx`

**Where:** `src/App.jsx`

- `showTimer` (`useState(false)`, line 8) is declared and never read or rendered anywhere.
- `selectedStock` / `setActiveSelectedStockFromMarketDataRequested` (line 11) is written inside the `searchTerm` effect (lines 24-33) but never read anywhere in `App` — it's fully dead, and its name collides conceptually with the *different*, actually-used `selectedStock` state local to `StockList`.
- `filteredStocks` (lines 35-39) is computed and passed to `<StockList filteredStocks={filteredStocks}>` (line 49), but `StockList`'s signature (`StockList.jsx:8`) only destructures `{ stocks, searchTerm }` — the prop is ignored, and `StockList` recomputes an equivalent list internally from `searchTerm` (`StockList.jsx:85-89`). Two implementations of the same filter exist; only one is live.
- `config = { theme: "dark", lang: "en" }` (line 18) is applied as `style={config}` on the root `<div>` (line 42). `theme` and `lang` aren't real CSS properties, so this has no visual effect — reads like an abandoned theming attempt.

## 10. Low — `SearchBar` duplicates `App`'s data fetch

**Where:** `src/components/SearchBar.jsx:14-22`

Rather than receiving the stock list `App` already loaded, `SearchBar` calls `generateStockData()` itself every time the query passes 3 characters, to build its typeahead suggestions. This is a second, independent copy of the same mock "network" call and data source.

## 11. Low — List keyed by array index

**Where:** `src/components/StockList.jsx:172` (`key={index}` on each stock card, inside a list that's re-sorted and re-filtered by user interaction)

Using the array index as the React key for a reorderable/filterable list is a standard anti-pattern. It doesn't currently produce a visible symptom (nothing in the card holds local component state or uncontrolled DOM state that would need to follow the underlying stock across a re-sort), but it would silently misbehave the moment any such state were added to a card.

## 12. Low — Low-contrast text in the details panel

**Where:** `src/App.css:244-250` and `src/App.css:302-304` (two separate, overlapping `.user-details p` rules)

Details-panel paragraphs render in `#999` at `11px` on a `#e9ecef` background — visibly hard to read in [`assets/details-and-news-stuck.png`](./assets/details-and-news-stuck.png). The two `.user-details p` rules (lines 244-250 and 302-304) also partially conflict: the later one in the file wins for `margin`, the earlier one wins for `color`/`font-size`/`margin-bottom` (which the later rule doesn't redeclare) — functional today only because of CSS cascade order, not because it's written to be.

## 13. Cosmetic — Missing favicon (404 on load)

**Where:** `index.html:5` references `/vite.svg`; there is no `public/` directory in the project and no `vite.svg` anywhere in the repo.

Produces a `404` in the console on every page load. No functional impact.

## 14. Low — User-triggered fetches modeled as state + effect instead of event handlers

**Where:** `src/components/StockList.jsx:20-32` (`[selectedStock]` effect) and `:34-41` (`[expandedStock]` effect)

Both "View Details" and "Show News" are direct click actions, but neither click handler (`setSelectedStock(stock.symbol)` / `loadStockNews` → `setExpandedStock(symbol)`) does the fetch itself. Instead, each click sets a piece of state, and a separate `useEffect` watches that state to fire the actual request. This is the "event modeled as state + effect" pattern ([react.dev: should this code move to an event handler?](https://react.dev/learn/removing-effect-dependencies#should-this-code-move-to-an-event-handler)) — it adds a layer of indirection between the click and the fetch it causes, and is part of why issues #2 and #4 above exist: it makes it easy to lose track of which render cycle a given async response belongs to.

---

Issues #15-20 below turned up while writing the unit test suite (`src/**/*.test.jsx`), rather than while driving the app directly. They're appended here rather than merged into the ranked list above, to avoid renumbering entries that #14 and the details panel writeup already cross-reference by number.

## 15. Medium — "Hide News" never collapses the news panel

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

The button's label is conditional on `isExpanded`, but its `onClick` always calls `loadStockNews(stock.symbol)` — there is no branch that ever calls `setExpandedStock(null)`. Once a card's news panel is expanded, clicking "Hide News" just calls `setExpandedStock` with the *same* symbol again (a no-op state update), so the panel never closes and the button stays reading "Hide News" for the rest of the session. Covered by `src/components/StockList.test.jsx > news panel > should not collapse the panel when 'Hide News' is clicked`.

## 16. Medium — "Load Price History" fetches data that is never shown anywhere

**Where:** `src/components/StockList.jsx:268-277`

```js
<button
  onClick={() => {
    fetchHistoricalPrices(stockDetails.symbol).then((prices) => {
      console.log("Historical prices:", prices);
      // TODO
    });
  }}
>
  Load Price History
</button>
```

Clicking this button does fire a real request, but the result only reaches `console.log` behind a `// TODO`comment — there's no state update, so nothing on screen ever changes. From a user's perspective, the button is dead: nothing visibly happens when it's clicked.

## 17. Medium — ~~`fetchStockDetails` errors are swallowed and leave the loading indicator stuck forever~~ (Fixed)

**Where:** `src/components/StockList.jsx` (`viewStockDetails`)

**Status: Fixed.** The fetch now runs through a `.finally(() => setLoading(false))`, so the loading indicator clears whether the request succeeds or fails. Covered by `StockList.test.jsx > stock details > should log the error and clear the loading indicator if fetchStockDetails rejects (known issue #17, fixed)`.

The error is still only reported via `console.log` (not surfaced anywhere in the UI), so a failed request is still silent from the user's perspective beyond the loader disappearing — only the "stuck forever" part of this issue is resolved.

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

## 18. Low — `SearchBar`'s suggestions dropdown never closes after picking a suggestion

**Where:** `src/components/SearchBar.jsx:48-55`

```js
onClick={() => {
  setValue(item.name);
  onSearch(item.name);
}}
```

Selecting a suggestion updates the input and reports the value via `onSearch`, but never calls `setSuggestions([])`. The (now stale) suggestions list stays open underneath the input after a selection.

## 19. Low — Stale suggestions stay visible after the search box is cleared

**Where:** `src/components/SearchBar.jsx:9-23` (`handleChange`)

`setSuggestions` is only ever called inside the `newValue.length > 2` branch. Clearing the input back to an empty string skips that branch entirely, so whatever suggestions were showing before the clear stay rendered, now disconnected from the (empty) query in the box.

## 20. Low — Dead `sortBy === "name"` branch in `sortStocks`

**Where:** `src/components/StockList.jsx:65-66`

```js
} else if (sortBy === "name") {
  comparison = a.name.localeCompare(b.name);
```

`sortBy` is only ever set by `handleSort`, which is only ever called from the six sort buttons rendered in the controls bar (Symbol, Price, Change, Volume, Sector, Avg Price) — none of them pass `"name"`. This branch can't be reached through the UI at all; it's the same flavor of dead code as the unused `showTimer`/`selectedStock` state already noted in issue #9, just in `StockList` instead of `App`.
