# Known Issues

Every issue found during the audit, in the order I'd rank them by impact. Each was either observed directly while driving the running app in a browser, or traced to a specific line while reading the source — usually both.

**22 of 23 are fixed.** The exception is [#5](#issue-5-details-panel-values-are-unrelated-to-the-summary-card-for-the-same-symbol), which is a property of the mock data generator rather than a bug in the app.

Fixes carry a **Tests** line naming the regression test that pins them. Those tests are tagged with their issue number in the source, so `grep -rn "issue #" src` maps them back here. A few issues (dead code, CSS) are verified by reading or by eye rather than by test, and say so.

---

### Issue #1: Sorting by "Avg Price" before data loads crashes the app

**Location:** `src/hooks/useStockSort.js` (the `"metrics"` branch), `src/utils/sorting.js` (`compareByAveragePrice`) — originally `src/components/StockList.jsx:76-78`

**Severity:** Critical

**Description:** The "metrics" sort branch read `stockMetrics[a.id].avgPrice` without checking whether the entry existed. Since `stockMetrics` populates asynchronously per stock (~800ms after mount), sorting by Avg Price before all metrics had loaded threw `TypeError: Cannot read properties of undefined (reading 'avgPrice')`.

**Impact:** No error boundary existed anywhere in the tree, so the uncaught error unmounted the entire app — not just the grid, but the search box and header too, leaving a blank page.

**Solution:** The comparator now reads `stockMetrics[a.id]?.avgPrice` / `stockMetrics[b.id]?.avgPrice` optionally, and stocks whose metrics haven't loaded yet always sort to the end of the list regardless of sort direction, instead of throwing.

**Tests:** `useStockSort.test.js > should not throw and should keep original order when sorting by average price before any metrics have loaded (fixes critical bug #1)` and `> should sort stocks with loaded metrics first and push stocks with missing metrics to the end, in both directions`; the comparator itself in `utils/sorting.test.js > compareByAveragePrice` (4 cases, both directions plus both-missing).

---

### Issue #2: News panel can get permanently stuck on "Loading news…"

**Location:** `src/hooks/useStockNews.js` (`loadStockNews`) — originally `src/components/StockList.jsx:34-41`

**Severity:** High

**Description:** `stockNews` was mutated in place and then passed back into `setStockNews` as the same object reference. React bails out of re-rendering when the new state is reference-equal (`Object.is`) to the current state, so this update didn't trigger a re-render on its own.

**Impact:** The panel's reliability depended entirely on whether an unrelated state update happened to fire afterward — non-deterministic from the user's perspective. In isolation, the panel stayed on "Loading news..." indefinitely even though the data had already arrived.

**Solution:** `setStockNews` now builds a new object via `setStockNews((prev) => ({ ...prev, [symbol]: news }))`, so the panel reliably re-renders as soon as the response resolves.

**Tests:** `useStockNews.test.js > should store the resolved news keyed by symbol` and `> should keep a previously loaded stock's news after news for a different stock resolves` — the latter is the one that would fail again on a mutated-reference regression.

---

### Issue #3: Watchlist does not persist, despite being documented as doing so

**Location:** `src/hooks/useWatchlist.js`

**Severity:** High

**Description:** `watchlist` was a plain `useState([])` with no `localStorage` reference anywhere in the hook or the rest of `src/`, despite the root README documenting "Watchlist functionality with localStorage."

**Impact:** Toggling a star and reloading the page cleared every star; `window.localStorage.length` was `0` immediately after toggling. Only the in-memory/visual half of the feature worked.

**Solution:** `watchlist` now initializes lazily from `localStorage` (key `"watchlist"`, JSON-encoded, falling back to `[]` on missing or invalid data — non-array values included). `toggleWatchlist` writes the new list back through a `persistWatchlist` helper before setting state; both read and write are wrapped in `try`/`catch`, so a disabled or full storage degrades to an in-memory watchlist instead of throwing.

**Tests:** `useWatchlist.test.js > should persist to localStorage when a stock is toggled on (issue #3, fixed)`, `> ... toggled off (issue #3, fixed)`, and `> should initialize from a previously stored watchlist (issue #3, fixed)`, plus three fallback cases for invalid JSON, a JSON `null`, and a JSON object.

---

### Issue #4: `fetchStockDetails` responses can arrive out of order (no request cancellation)

**Location:** `src/hooks/useStockDetails.js` (`viewStockDetails`) — originally `src/components/StockList.jsx:20-32`; delay logic in `src/utils/mockStockApi.js:113-118`

**Severity:** Medium

**Description:** Every "View Details" click started a new `fetchStockDetails` call without tracking or cancelling the previous in-flight request. Each response is delayed randomly by 500–2500ms.

**Impact:** Clicking stock A and then quickly clicking stock B could let A's slower response resolve after B's, overwriting the panel and showing details for a stock other than the one currently selected.

**Solution:** `viewStockDetails` increments a `latestDetailsRequestId` ref and captures that id in the closure; the resolve and `finally` handlers only call `setStockDetails`/`setLoading(false)` if the id they captured is still the current one. A counter rather than the symbol, deliberately — it also discards a stale response whose symbol happens to match the latest request (AAPL → NVDA → AAPL, where the first AAPL response lands last). A separate `latestHistoryRequestId` plus a `selectedSymbol` ref does the same for price history.

**Tests:** `useStockDetails.test.js > should discard a stale response when a newer request was issued after it (issue #4, fixed)` and `> should discard a stale response that shares its symbol with the latest request (AAPL -> NVDA -> AAPL)`.

---

### Issue #5: Details panel values are unrelated to the summary card for the same symbol

**Location:** `src/utils/mockStockApi.js:114-135` (`fetchStockDetails`)

**Severity:** Medium

**Description:** `fetchStockDetails` ignores the actual stock record and generates entirely new random numbers, only echoing the symbol / a derived name. Example captured live for AAPL: summary card showed price `$178.52` / `+2.30%`; the details panel showed `$302.60` / `1.83%` / company "AAPL Corporation" vs. "Apple Inc." on the card.

**Impact:** No number in the details panel can currently be cross-checked against the card that opened it, undermining trust in the displayed data.

**Solution:** **Not fixed.** This is a property of the mock data generator rather than a rendering bug — still open.

**Tests:** `mockStockApi.test.js > should return freshly randomized data on every call rather than a fixed record for the symbol (known issue #5)` — pins the current behaviour so the gap is documented in the suite rather than forgotten.

---

### Issue #6: Non-responsive layout causes horizontal page scroll on narrow viewports

**Location:** `src/App.css` (`.sort-controls`)

**Severity:** Medium

**Description:** `.sort-controls` (shared with `.filter-controls`) had no `flex-wrap`, so the six sort buttons forced the row wider than its container. At a 400px viewport, `scrollWidth` measured 528px against a 385px `clientWidth` — 143px of horizontal overflow.

**Impact:** Users on narrow/mobile viewports got horizontal page scroll instead of the controls wrapping onto additional lines.

**Solution:** Added `flex-wrap: wrap` to `.sort-controls`. Verified live: `scrollWidth` now equals `clientWidth` (385px both) at a 400px viewport.

**Tests:** None. Verified in-browser at a 400px viewport: `scrollWidth` now equals `clientWidth` (385px both), down from 528px/385px.

---

### Issue #7: Large blank gap on every stock card

**Location:** `src/App.css` (`.stock-name`)

**Severity:** Low

**Description:** `.stock-name` had `margin: 88px 0`, wildly out of scale with every other spacing rule in the file (e.g. `.stock-sector`'s `margin: 8px 0`), pushing a large empty gap before the price on every card.

**Impact:** Visibly broken layout across the entire stock grid.

**Solution:** Changed `margin: 88px 0` to `margin: 8px 0`, matching the scale of the rest of the stylesheet.

**Tests:** None. A spacing value; verified by eye against the other vertical rules in the file.

---

### Issue #8: Missing `key` prop on sector `<option>` elements

**Location:** `src/components/StockControls.jsx` (sector `<select>`) — originally `src/components/StockList.jsx:154-157`

**Severity:** Low

**Description:** Sector `<option>` elements were rendered via `.map` without a `key` prop, producing a React console warning on every render.

**Impact:** Console warning noise, and a code smell that risks list-reconciliation bugs if the option list order ever changes.

**Solution:** Options now render as `<option key={sector} value={sector}>{sector}</option>`.

**Tests:** None — a missing-`key` warning isn't something the setup asserts on. Confirmed by reading `StockControls.jsx`.

---

### Issue #9: Dead state and props in `App.jsx`

**Location:** `src/App.jsx`

**Severity:** Low

**Description:** `App` carried dead code: a `filteredStocks` computation duplicating `useStockFilters` (and case-sensitive besides), an ignored `filteredStocks` prop passed to `StockList`, and an unused `config = { theme: "dark", lang: "en" }` object applied via `style={config}` on the root `<div>`.

**Impact:** Dead code adds confusion and maintenance overhead with no functional purpose.

**Solution:** All dead state, props, and the unused `config` object were deleted. `App` now only passes `stocks` and `searchTerm` to `StockList`.

**Tests:** Pure deletion, no behaviour change. The existing `App.test.jsx` suite passes unchanged; the tests that had pinned the dead prop's own quirky behaviour were removed with it.

---

### Issue #10: `SearchBar` duplicates `App`'s data fetch

**Location:** `src/components/SearchBar.jsx`

**Severity:** Low

**Description:** `SearchBar` called `generateStockData()` itself on every keystroke past 3 characters to build its typeahead suggestions — a second, independent copy of the same mock "network" call `App` already made.

**Impact:** Redundant network/data-generation work and a second source of truth for the same underlying data.

**Solution:** `SearchBar` now takes the already-loaded `stocks` prop from `App` and filters it directly, with no fetch of its own.

**Tests:** `SearchBar.test.jsx > should render matching suggestions the instant the query exceeds 2 characters, straight from the stocks prop (issue #10, fixed)` and `> should recompute suggestions against the stocks prop on every keystroke past the threshold`.

---

### Issue #11: List keyed by array index

**Location:** `src/components/StockList.jsx` (stock grid `.map`)

**Severity:** Low

**Description:** The stock grid used the array index (`key={index}`) as the React key for a list that gets re-sorted and re-filtered by user interaction — a standard anti-pattern.

**Impact:** No visible symptom at the time, but would silently misbehave the moment any card gained local or uncontrolled DOM state.

**Solution:** Each item now renders as `<div role="listitem" key={stock.id}>`, keyed by the stable underlying id instead of the array index.

**Tests:** None specific to the key. `StockList.test.jsx > renders one card per stock, in the order returned by useStockSort` exercises the keyed list; confirmed by reading `StockList.jsx`.

---

### Issue #12: Low-contrast text in the details panel

**Location:** `src/App.css` (`.user-details p`)

**Severity:** Low

**Description:** Details-panel paragraphs rendered in `#999` at 11px on a `#e9ecef` background — hard to read. Two separate, overlapping `.user-details p` rules also partially conflicted, working only by virtue of CSS cascade order.

**Impact:** Poor readability/accessibility of the details panel text.

**Solution:** The two rules were merged into one, with `color: #495057` against the panel background, and the redundant duplicate rule was removed.

**Tests:** None. A colour value; verified in-browser against the panel background.

---

### Issue #13: Missing favicon (404 on load)

**Location:** `index.html:5`, `public/vite.svg`

**Severity:** Cosmetic

**Description:** `index.html` referenced `/vite.svg`, but there was no `public/` directory or `vite.svg` file anywhere in the repo.

**Impact:** A 404 in the console on every page load; no functional impact.

**Solution:** Added `public/vite.svg` so the existing `<link rel="icon" href="/vite.svg">` reference resolves.

**Tests:** None. Verified in-browser: no 404 in the console on load.

---

### Issue #14: User-triggered fetches modeled as state + effect instead of event handlers

**Location:** `src/hooks/useStockDetails.js` (`viewStockDetails`), `src/hooks/useStockNews.js` (`loadStockNews`) — originally `src/components/StockList.jsx:20-32`, `:34-41`

**Severity:** Low

**Description:** "View Details" and "Show News" were direct click actions, but neither click handler performed the fetch itself. Instead, each click set a piece of state, and a separate `useEffect` watched that state to fire the actual request (the "event modeled as state + effect" anti-pattern).

**Impact:** Added indirection between the click and the fetch it caused, and was a contributing cause of issues #2 and #4 — it made it easy to lose track of which render cycle a given async response belonged to.

**Solution:** `viewStockDetails` and `loadStockNews` now call `fetchStockDetails` / `fetchStockNews` directly from the click handler, with no intervening effect.

**Tests:** Structural. `useStockDetails.test.js` and `useStockNews.test.js` call the handlers directly, which is only possible because the fetches no longer hang off an effect.

---

### Issue #15: "Hide News" never collapses the news panel

**Location:** `src/hooks/useStockNews.js` (`loadStockNews`) — originally `src/components/StockList.jsx:116-118`, `:220-221`

**Severity:** Medium

**Description:** The button's label toggled between "Show News"/"Hide News" based on `isExpanded`, but its `onClick` always called `loadStockNews(symbol)`, which always called `setExpandedStock(symbol)` — there was no branch that ever called `setExpandedStock(null)`.

**Impact:** Once expanded, clicking "Hide News" was a no-op state update; the panel never closed for the rest of the session.

**Solution:** `loadStockNews` now checks whether the clicked symbol is already the expanded one and, if so, calls `setExpandedStock(null)` and returns before firing any fetch.

**Tests:** `useStockNews.test.js > should collapse the panel when the already-expanded stock is requested again (issue #15, fixed)` and `> should not re-fetch news when collapsing an already-expanded stock (issue #15, fixed)`.

---

### Issue #16: "Load Price History" fetches data that is never shown anywhere

**Location:** `src/hooks/useStockDetails.js`, `src/components/StockDetailsPanel.jsx`

**Severity:** Medium

**Description:** `loadPriceHistory` fired a real request, but the result only reached `console.log` behind a `// TODO` comment — no state update ever occurred, so nothing on screen changed.

**Impact:** From a user's perspective, the "Load Price History" button was dead — clicking it visibly did nothing.

**Solution:** Fetched prices are now stored in a `priceHistory` state (plus a `priceHistoryLoading` flag) and rendered by `StockDetailsPanel` as a scrollable list, with stale/superseded responses discarded via the same request-id guard that fixed issue #4.

**Tests:** `useStockDetails.test.js > should fetch and populate historical prices for the current details' symbol when loadPriceHistory is called (issue #16, fixed)`, `> should discard a stale price-history response for a stock that's no longer selected`, `> should reset price history when a new stock's details are requested`, and `StockDetailsPanel.test.jsx > should render the fetched price history once loaded (issue #16, fixed)`.

---

### Issue #17: `fetchStockDetails` errors are swallowed and leave the loading indicator stuck forever

**Location:** `src/hooks/useStockDetails.js` (`viewStockDetails`) — originally `src/components/StockList.jsx:20-32`

**Severity:** Medium

**Description:** The `.catch` handler only logged the error and never called `setLoading(false)`, so a rejected `fetchStockDetails` call would leave "Loading stock details..." on screen indefinitely.

**Impact:** A failed request gave the user no indication it had failed — the UI would appear permanently stuck loading.

**Solution:** The fetch now runs through `.finally(() => setLoading(false))`, so the loading indicator clears whether the request succeeds or fails. (The error is still only `console.log`-ged, not surfaced in the UI — that part remains open.)

**Tests:** `useStockDetails.test.js > should log the error and clear loading if fetchStockDetails rejects (issue #17, fixed)`.

---

### Issue #18: `SearchBar`'s suggestions dropdown never closes after picking a suggestion

**Location:** `src/components/SearchBar.jsx`

**Severity:** Low

**Description:** Selecting a suggestion updated the input and called `onSearch`, but never called `setSuggestions([])`, so the (now stale) suggestions list stayed open underneath the input.

**Impact:** Confusing UX — a stale dropdown remained visible after a selection had already been made.

**Solution:** Picking a suggestion now also calls `setSuggestionsVisible(false)`, closing the dropdown immediately after selection.

**Tests:** `SearchBar.test.jsx > should close the suggestions list after a suggestion is clicked (issue #18, fixed)`.

---

### Issue #19: Stale suggestions stay visible after the search box is cleared

**Location:** `src/components/SearchBar.jsx` (`handleChange`)

**Severity:** Low

**Description:** Suggestions were only ever updated inside the `newValue.length > 2` branch, so clearing the input back to empty skipped that branch and left the previous suggestions rendered, disconnected from the now-empty query.

**Impact:** The dropdown could show suggestions unrelated to the (empty) search box content.

**Solution:** Suggestions are now derived on every render from the current query and a `suggestionsVisible` flag set by `handleChange`, so clearing the input hides the dropdown immediately with no stale state left behind.

**Tests:** `SearchBar.test.jsx > should hide the suggestions once the query is cleared back to the threshold (issue #19, fixed)`.

---

### Issue #20: Dead `sortBy === "name"` branch in the sort comparators

**Location:** `src/constants/sorting.js`

**Severity:** Low

**Description:** `SORT_FIELDS.NAME` and its `SORT_COMPARATORS` entry existed, but `sortBy` is only ever set by the six sort buttons in `StockControls.jsx` (Symbol, Price, Change, Volume, Sector, Avg Price) — none of which pass `SORT_FIELDS.NAME` — making the branch unreachable through the UI.

**Impact:** Dead code with no functional purpose, adding maintenance noise.

**Solution:** `SORT_FIELDS.NAME` and its comparator entry were deleted; the full test suite passes unchanged.

**Tests:** Pure deletion of an unreachable branch. No test referenced `SORT_FIELDS.NAME`; `useStockSort.test.js` and `StockControls.test.jsx` pass unchanged.

---

### Issue #21: `formatVolumeInMillions` renders `NaNM`, or silently shows `null` volume as `0.0M`

**Location:** `src/utils/formatters.js` (`formatVolumeInMillions`), `src/components/StockCard.jsx:58`, `src/components/StockDetailsPanel.jsx:15`

**Severity:** Low

**Description:** `formatVolumeInMillions` divided `volume` by 1,000,000 with no validation. An `undefined`/non-numeric volume produced `"NaN"` (rendered as "NaNM" since both call sites appended a literal "M"), and a `null` volume coerced to `0`, silently rendering as "0.0M" — indistinguishable from a genuinely zero volume.

**Impact:** Missing or invalid volume data displayed as either garbled text ("NaNM") or a misleading fake value ("0.0M") instead of a clear "no data" indicator.

**Solution:** `formatVolumeInMillions` is now a pure numeric conversion that returns `null` for any non-finite input; a new `formatVolumeLabel` helper handles display formatting (decimals, "M" suffix, "N/A" fallback), and both call sites now use it directly.

**Tests:** `formatters.test.js` — 8 cases across both functions, covering missing, `null`, non-numeric and non-finite volume, and the `N/A` label with no stray `M` suffix.

---

### Issue #22: Volume and Avg Price run together with no spacing on the stock card

**Location:** `src/App.css` (`.user-stats`), `src/components/StockCard.jsx:58-59`

**Severity:** Cosmetic

**Description:** `.user-stats` set no `display`/`gap`/margin between its two `<small>` children, so the two inline stats butted up against each other (e.g. "Volume: 7.0MAvg: 192.91").

**Impact:** Confusing, hard-to-read stats on every stock card.

**Solution:** `.user-stats` is now `display: flex` with `justify-content: space-between`, `flex-wrap: wrap`, and `gap: 4px`, visually separating the two stats.

**Tests:** None. A layout rule; verified in-browser as two visually separated stats.

---

### Issue #23: `SearchBar`'s suggestions dropdown stayed open when clicking elsewhere on the page

**Location:** `src/components/SearchBar.jsx`

**Severity:** Low

**Description:** The suggestions dropdown only closed when a suggestion was picked or the query dropped back to the threshold. Clicking anywhere else on the page (the stock grid, the heading, empty space) left it open indefinitely, disconnected from focus.

**Impact:** A floating, disconnected dropdown remained visible regardless of where the user's attention had moved.

**Solution:** A new reusable `useClickOutside` hook attaches a `mousedown` listener (only while the dropdown is visible) that closes the dropdown when a click falls outside the search bar's container, without touching the query or input value.

**Tests:** `SearchBar.test.jsx > should close the suggestions list when clicking outside the search bar, without changing the query (issue #23, fixed)`, and the hook itself in `useClickOutside.test.js` (4 cases: outside, inside, disabled, unmount cleanup).
