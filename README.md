# Stock Trading Dashboard

A refactor of a deliberately flawed React dashboard, done as the FE Innovation Assignment.

The starting point was a small, working stock-trading dashboard written without much care — dead code, an over-stuffed `StockList`, a crash when sorting before data loaded, a watchlist that claimed to persist but didn't, and a handful of half-built features. The brief was to bring it up to a standard I'd be comfortable owning, **without redesigning the UI or changing what the app does**.

The app looks and behaves the way it always did. Everything that changed is underneath.

## Start here

| Document | What's in it |
|---|---|
| **[REPORT.md](./REPORT.md)** | The write-up: what I found, what I changed and why, how I worked, and what I deliberately left alone. |
| [docs/known-issues.md](./docs/known-issues.md) | All 32 issues found, with location, severity, impact, fix, and the test that pins each one. |
| [docs/features.md](./docs/features.md) | Inventory of what the app actually does — written by driving the running app, not by reading source. |
| [docs/FE Innovation Assignment.md](./docs/FE%20Innovation%20Assignment.md) | The original brief. |

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm test` | Run the suite once (152 tests) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with autofix |

## How it's laid out

```
src/
  App.jsx                  fetch stocks, hold the search term, pass both down
  components/
    ErrorBoundary.jsx      catches render errors instead of blanking the page
    SearchBar.jsx          input + typeahead dropdown
    StockList.jsx          composition only — wires hooks to components
    StockCard.jsx          one stock: price, change, watchlist star, news
    StockNews.jsx          the news panel's loading / empty / loaded states
    StockControls.jsx      sort buttons + sector select
    StockDetailsPanel.jsx  details + price history
  hooks/
    useWatchlist.js        watchlist state, persisted to localStorage
    useStockFilters.js     search + sector filtering, unique sectors
    useStockSort.js        sort field/direction
    useStockMetrics.js     per-stock average price from historical data
    useStockNews.js        per-stock news, expand/collapse
    useStockDetails.js     details + price history, with stale-response guards
    useClickOutside.js     reusable outside-click listener
  utils/
    mockStockApi.js        the simulated API (unchanged)
    formatters.js          volume formatting
    sorting.js             the one comparator that needs external state
  constants/
    sorting.js             sort fields + comparator lookup table
```

`StockList` was the centre of gravity in the original — sorting, filtering, four fetches, watchlist and news state all lived in one file. It's now composition only; every piece of behaviour sits in a hook that can be tested on its own.

## Quality gates

Every change runs through the same checks locally and in CI:

- **ESLint** (flat config) — `react`, `react-hooks`, `jsx-a11y`, `import/order`, plus `no-unused-vars` and `no-console`.
- **Vitest + Testing Library** — 152 tests. Fixed bugs carry a regression test tagged with their issue number, so `grep "issue #"` maps tests back to [docs/known-issues.md](./docs/known-issues.md).
- **Husky** — `pre-commit` runs lint-staged, `pre-push` runs the suite.
- **GitHub Actions** — lint, tests, and build on every PR.
- **CodeRabbit** — automated review on every PR.

## Scope

The brief drew one hard line: don't redesign, don't add or remove features. I stayed on the right side of it. The changes that do touch what a user sees are all cases where an existing control was broken or a documented feature didn't work — a "Hide News" button that didn't hide, a "Load Price History" button whose result went to `console.log`, a watchlist the original README advertised as persistent but wasn't. Each one is argued individually in [REPORT.md](./REPORT.md#uiux-changes-and-why-each-one-is-in-scope).
