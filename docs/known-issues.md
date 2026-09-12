# Known Issues

Every issue found during the audit, in the order I'd rank them by impact. Each was either observed directly while driving the running app in a browser, or traced to a specific line while reading the source — usually both.

**30 of 32 are fixed.** Two are deliberately left alone: [#5](#issue-5-details-panel-values-are-unrelated-to-the-summary-card-for-the-same-symbol), a property of the mock data generator rather than a bug in the app, and [#31](#issue-31-usewatchlist-computes-the-next-list-from-a-stale-closure-not-changed), where the fix costs more than the unreachable bug it guards against. Both say why in full.

Issues **#1–#23** came out of the first audit pass. **#24–#32** came out of a second pass over the refactored code — mostly error handling, plus the leftovers of earlier fixes that had been applied in one place and missed in another.

Fixes carry a **Tests** line naming the regression test that pins them. Those tests are tagged with their issue number in the source, so `grep -rn "issue #" src` maps them back here. A few issues (dead code, CSS) are verified by reading or by eye rather than by test, and say so.

---

### Issue #1: Sorting by "Avg Price" before data loads crashes the app

**Location:** `src/hooks/useStockSort.js` (the `"metrics"` branch), `src/utils/sorting.js` (`compareByAveragePrice`) — originally `src/components/StockList.jsx:76-78`

**Severity:** Critical

**Description:** The "metrics" sort branch read `stockMetrics[a.id].avgPrice` without checking whether the entry existed. Since `stockMetrics` populates asynchronously per stock (~800ms after mount), sorting by Avg Price before all metrics had loaded threw `TypeError: Cannot read properties of undefined (reading 'avgPrice')`.

**Impact:** No error boundary existed anywhere in the tree, so the uncaught error unmounted the entire app — not just the grid, but the search box and header too, leaving a blank page. (That structural gap is addressed separately in [#24](#issue-24-no-error-boundary-anywhere-in-the-tree).)

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

**Solution:** `watchlist` now initializes lazily from `localStorage` (key `"watchlist"`, JSON-encoded, falling back to `[]` on missing or invalid data — non-array values included), and `toggleWatchlist` writes the new list back through a `persistWatchlist` helper before setting state. Both read and write are wrapped in `try`/`catch`, so a disabled or full storage degrades to an in-memory watchlist instead of throwing. Writing from the handler rather than an effect keeps it to exactly one write per toggle and none on mount — see [#31](#issue-31-usewatchlist-computes-the-next-list-from-a-stale-closure-not-changed) for why the effect-based alternative was tried and dropped.

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

**Tests:** None specific to the key. `StockList.test.jsx > renders one card per stock, in the order returned by useStockSort` exercises the keyed list; confirmed by reading `StockList.jsx`. (`SearchBar` had the same defect and was missed at the time — see [#28](#issue-28-searchbar-suggestions-keyed-by-array-index).)

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

**Solution:** The fetch now runs through `.finally(() => setLoading(false))`, so the loading indicator clears whether the request succeeds or fails, and the `.catch()` reports through `console.error`. The error is still not surfaced in the UI — that part remains open, since showing it needs an error state in the panel, which the "don't redesign" boundary rules out. The same missing-`.catch()` shape turned up in three other fetches, handled in [#26](#issue-26-unhandled-promise-rejections-in-three-fetches).

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

### Issue #24: No error boundary anywhere in the tree

**Location:** `src/main.jsx`, `src/components/ErrorBoundary.jsx`

**Severity:** Medium

**Description:** Nothing in the app caught render errors. This is the structural reason [#1](#issue-1-sorting-by-avg-price-before-data-loads-crashes-the-app) was Critical rather than merely broken: React unmounts the whole tree on an uncaught render error, so a bug isolated to the stock grid took the header and search box down with it.

**Impact:** Any render error — the one in #1, or any future one — turns the entire page blank, with no message and no way back other than a manual reload.

**Solution:** Added an `ErrorBoundary` class component and wrapped `<App />` in it. On a caught error it logs to `console.error` and renders a plain fallback (`role="alert"`) explaining what happened, with a button to reload. Fixing #1 removed the known trigger; this removes the blast radius for the unknown ones.

**Tests:** `ErrorBoundary.test.jsx` — 4 cases: renders children when nothing throws, renders the fallback instead of unmounting when a child throws, logs the caught error, and wires the reload button.

---

### Issue #25: App was not wrapped in `React.StrictMode`

**Location:** `src/main.jsx`

**Severity:** Low

**Description:** The root render was a bare `ReactDOM.createRoot(...).render(<App />)` with no `StrictMode`.

**Impact:** In development, StrictMode double-invokes effects and state updaters to surface impure logic and missing effect cleanup. Without it, exactly the class of bug this codebase had (effects with side effects, state updated from a stale closure) stays invisible until it misbehaves in production.

**Solution:** Wrapped the tree in `<StrictMode>`. Verified in a browser afterwards that the double-invoked effects cause no duplicate-state or console problems: the app loads, sorts, expands news and collapses it with zero console errors or warnings.

**Tests:** None directly — `src/main.jsx` is the composition root and is excluded from coverage. Its effect is that the rest of the suite and the browser pass under StrictMode's stricter semantics.

---

### Issue #26: Unhandled promise rejections in three fetches

**Location:** `src/hooks/useStockMetrics.js`, `src/hooks/useStockNews.js`, `src/hooks/useStockDetails.js` (`loadPriceHistory`)

**Severity:** Medium

**Description:** All three chained `.then()` with no `.catch()`. Only `fetchStockDetails` had error handling, added for [#17](#issue-17-fetchstockdetails-errors-are-swallowed-and-leave-the-loading-indicator-stuck-forever).

**Impact:** A failed request produced an unhandled promise rejection and left the UI on a loading state that could never clear — "Avg: Loading..." on the card, "Loading news..." in the panel, "Loading price history..." under the details. The same failure shape as #17, in three more places.

**Solution:** Each chain now has a `.catch()` that logs via `console.error`. `useStockNews` also records an empty list for the failed symbol so the card can say there's no news rather than sit on a loading message (see [#27](#issue-27-stockcard-treats-an-empty-news-list-as-still-loading)); `useStockMetrics` records a terminal `{ error: true }` entry for the failed stock so `StockCard` renders "Avg: N/A" instead of retaining "Avg: Loading..." forever; `loadPriceHistory` keeps its existing `.finally()`, which already cleared the loading flag on both paths.

**Tests:** `useStockNews.test.js > should record an empty list if the request rejects, ending the loading state (issue #26, fixed)`, `useStockMetrics.test.js > should record a terminal error state and log if a stock's request rejects (issue #26, fixed)`, `StockCard.test.jsx > should show 'N/A' for avg price if the metrics request failed (issue #26, fixed)`, `StockList.test.jsx > passes a failed metrics entry through so the card shows 'N/A' instead of loading forever (issue #26, fixed)`, and `useStockDetails.test.js > should log and clear the loading flag if the price-history request rejects (issue #26, fixed)`.

---

### Issue #27: `StockCard` treats an empty news list as still loading

**Location:** `src/components/StockCard.jsx`, `src/hooks/useStockNews.js`

**Severity:** Medium

**Description:** The card rendered `news.length === 0 ? "Loading news..." : <list>`, and `StockList` passed `stockNews[symbol] || []`. "No articles" and "not loaded yet" were therefore the same state, and the hook tracked no loading flag to tell them apart.

**Impact:** A genuinely empty response — or, once [#26](#issue-26-unhandled-promise-rejections-in-three-fetches) was handled, a failed one — would display "Loading news..." forever. The current mock API always returns 3 articles, so this was latent rather than reproducible, but it's the same defect class as #2.

**Solution:** `StockList` stops collapsing the distinction with `|| []` and passes `stockNews[symbol]` through as-is, so the entry itself carries all three states: **absent** while the request is in flight, **empty array** once it settled with nothing to show (or failed), **non-empty** when there are articles. The card reads them straight off that one value, as a ternary chain rather than `&&` guards (`rendering-conditional-render`).

No loading flag exists anywhere. The first two attempts at this fix both added one — first a `loadingSymbol` state kept in sync from a `.finally()`, then the same value derived during render and passed down as an `isNewsLoading` prop. Both were redundant: the card only renders this block when the stock is expanded, and an expanded stock with no entry yet *is* the loading state. Dropping the concept removed a `useState`, a `.finally()`, a conditional state updater, a derived expression, and a prop — and took both `useStockNews.js` and `StockCard.jsx` to 100% branch coverage, because the branches that existed only to keep the flag honest went with it. (`rerender-derived-state-no-effect`.)

**Tests:** `StockNews.test.jsx > should say there is no news when the response settled empty (issue #27, fixed)` and `> should show a loading message while no news entry has arrived yet` pin the two states apart; `useStockNews.test.js > should leave the entry absent while the request is in flight and set it once resolved` pins the same distinction in the hook. `StockCard.test.jsx` keeps only the card's own concern — whether the panel is rendered at all.

The wiring needed its own guard: with the component and hook tested in isolation, restoring the `|| []` on the prop left the whole suite green. `StockList.test.jsx > passes an unloaded news entry through as undefined, so the card can tell loading from empty (issue #27, fixed)` and `> passes an empty news entry through as empty, not as still loading (issue #27, fixed)` close that — verified to fail if the fallback comes back.

---

### Issue #28: `SearchBar` suggestions keyed by array index

**Location:** `src/components/SearchBar.jsx`

**Severity:** Low

**Description:** The suggestions list rendered `suggestions.map((item, idx) => <li key={idx}>)`. This is the same defect fixed in `StockList` under [#11](#issue-11-list-keyed-by-array-index) — the search component was simply missed at the time.

**Impact:** The list is re-derived on every keystroke, so indexes shift as matches change. With no local state inside the rows nothing visibly breaks today, but the keys are meaningless for reconciliation and would misbehave the moment a row gained state.

**Solution:** Keyed by `item.id`, the stable identifier already present on every stock record.

**Tests:** No dedicated test — like #11, key correctness isn't something the setup asserts on. Covered indirectly by the existing `SearchBar.test.jsx` suggestion tests, which still pass.

---

### Issue #29: `useClickOutside` dereferences a possibly-null ref

**Location:** `src/hooks/useClickOutside.js`

**Severity:** Low

**Description:** The listener called `ref.current.contains(e.target)` with no null check.

**Impact:** Throws if the event fires while the ref holds no element — before the element attaches, or after it unmounts.

**Solution:** Guard `ref.current` before calling `contains`.

**Tests:** `useClickOutside.test.js > should not throw when the ref holds no element yet (issue #29, fixed)`, plus `> should call the latest handler after a re-render, not a stale one`, which pins the behaviour that keeping `onOutsideClick` in the deps gives for free.

**Also considered and dropped:** because `SearchBar` passes a fresh inline arrow, listing `onOutsideClick` in the effect's deps re-subscribes the `document` listener on every render — every keystroke while the dropdown is open. Holding the handler in a ref lets the effect depend on `[ref, enabled]` and attach once (`advanced-use-latest`). I implemented it and took it back out: it trades a `remove`/`addEventListener` pair — two cheap synchronous DOM calls — for a `useRef` plus a second effect that runs on *every* render, and it makes staleness something you now have to reason about rather than get by construction. Same call as [#31](#issue-31-usewatchlist-computes-the-next-list-from-a-stale-closure-not-changed): worth doing when the subscription gets expensive or the component re-renders on something hotter than typing.

---

### Issue #30: Dead CSS for removed features

**Location:** `src/App.css`

**Severity:** Cosmetic

**Description:** `.timer`, `.timer-display`, `.counter`, `.counter h2`, and `.counter p` were still defined. The timer and counter features they styled were removed under [#9](#issue-9-dead-state-and-props-in-appjsx); the CSS was missed.

**Impact:** 28 lines of rules no class in the app references, shipped in every build and misleading anyone reading the stylesheet for what the app contains.

**Solution:** Deleted all five rules. Verified no `className` in `src/` references any of them.

**Tests:** None — pure deletion of unreferenced rules. Confirmed by grepping `className` across `src/` and by the app rendering unchanged in a browser afterwards.

---

### Issue #31: `useWatchlist` computes the next list from a stale closure (not changed)

**Location:** `src/hooks/useWatchlist.js`

**Severity:** Medium

**Description:** `toggleWatchlist` read `watchlist` from the render closure to build the next array, instead of using a functional update. React 18 batches state updates, so two toggles dispatched in the same tick both start from the same stale list.

**Impact:** In principle the second toggle silently discards the first. Reproduced at the hook level: toggling ids 1 and 2 in one batch produces `[2]` instead of `[1, 2]`, and persists the wrong list. **But it is not reachable through the UI** — `toggleWatchlist` is only ever called from a star's click handler, one call per event, and React does not merge two separate user clicks into one tick.

**Solution: deliberately not changed.** The fix is `setWatchlist((current) => …)`, which is the canonical idiom (`rerender-functional-setstate`). The catch is that a functional updater and synchronous persistence are mutually exclusive: with no `next` value outside the updater, `persistWatchlist` has to move either *into* the updater — making it impure, and running it twice under StrictMode ([#25](#issue-25-app-was-not-wrapped-in-reactstrictmode)) — or into a `useEffect` keyed on `watchlist`. I implemented the effect version and then reverted it: measured, it writes `["watchlist","[]"]` to `localStorage` on every mount with no user interaction at all, twice in development. Paying a redundant write on every page load, plus an extra effect to read, to guard a call pattern the app never uses is the wrong trade here.

Worth revisiting if the watchlist ever gains a caller that toggles more than one id at a time — "clear all", "add every result", or anything driven by a loop rather than a click. At that point the functional updater stops being theoretical and the effect earns its cost.

**Tests:** None — nothing changed. The existing `useWatchlist.test.js` persistence and restore-on-mount cases still cover the behaviour that does ship.

---

### Issue #32: Style objects rebuilt on every render

**Location:** `src/components/SearchBar.jsx`, `src/components/StockCard.jsx`

**Severity:** Low

**Description:** `SearchBar` built its `inputStyle` object inside the component body, and `StockCard` passed an inline object literal for the price span. Both are constant, and both were presentation that belonged in the stylesheet rather than in JSX.

**Impact:** A new object per render, so the `style` prop is never referentially equal and the allocation is pure garbage. Negligible at this size, but it's the pattern that stops being free once components are memoised.

**Solution:** Both constants moved into `App.css` as `.search-bar input` and `.stock-price-value`, removing the `style` prop from those elements entirely. The change percentage's style genuinely depends on props (`isPositive`, `isWatchlisted`) and stays inline — that one is state, not styling. This goes further than the `rendering-hoist-jsx` rule's minimum (hoisting to module scope), and it's safe here because these two were static values with no dynamic branch to preserve.

**Tests:** None added. The two constants moved to CSS render identically; the remaining `toHaveStyle` assertions in `StockCard.test.jsx` cover the dynamic span that stayed inline, and the full suite passes unchanged.
