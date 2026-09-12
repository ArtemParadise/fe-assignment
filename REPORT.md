# Refactoring report

Repo: [ArtemParadise/fe-assignment](https://github.com/ArtemParadise/fe-assignment)

## How I worked

The flow I actually followed:

**plan → audit what's there (issues + documentation) → cover it with unit tests so I'd notice if I broke something → linter for code style, dead code, best practices, a11y → refactoring on my own judgment → finishing off the audit findings.**

The order matters. I didn't want to start moving code around before I had something telling me when I broke it, and I didn't want to write tests before I knew what the app actually does. So the first two steps are both about building ground truth, not about improving anything.

Repo setup went straight to `main`. Everything after that — anything that needed CI and review — went through pull requests.

## The plan I started with

I wrote this before touching any code. It changed along the way, and I didn't finish all of it — on purpose, which I'll get to.

**1. Get familiar with the features** — what exists, how it works, what to check, what not to break.
- [x] Check how it works
- [x] Prepare documentation + Playwright MCP
- [x] Review and validate
- [x] Push documentation

**2. Repo setup**
- [x] Vitest
- [x] ESLint
- [x] CodeRabbit review
- [x] Unit tests covering existing functionality ([PR #1](https://github.com/ArtemParadise/fe-assignment/pull/1))
- [x] ESLint fixes ([PR #2](https://github.com/ArtemParadise/fe-assignment/pull/2))
- [x] Lint + tests on pre-commit / pre-push
- [x] Lint + tests in CI

**3. Basic skill setup**
- [x] Install `skill-creator`
- [x] Install `vercel-react-best-practices` (for optimisation)
- [ ] Write a custom "issues audit" skill
- [ ] Write a custom "improvements audit" skill
- [ ] Write a custom testing skill

**4. Issues audit fix**
- [x] Audit issues and improvements
- [x] Improve ESLint rules where needed
- [x] Review and validate, iterate

The unchecked items in step 3 are the deliberate part. More on that below.

## What I found

First thing that jumps out going through the code: unused imports, unused variables, dead chunks of code all over the place.

Second: `StockList` is heavily overloaded. Sorting, filtering, four different fetches, watchlist state, news state — all in one file. It needs decomposition into helpers, hooks, components, constants.

Underneath that were real bugs. The full list is in [docs/known-issues.md](./docs/known-issues.md) — 23 issues, 22 fixed. The ones that actually mattered:

| | |
|---|---|
| **#1, Critical** | Sorting by "Avg Price" before the averages loaded read `stockMetrics[a.id].avgPrice` on an entry that wasn't there yet. It threw, and with no error boundary anywhere the whole app unmounted — blank page, not just a broken grid. |
| **#2, High** | The news object was mutated in place and handed back to `setState` as the same reference. React bails on reference-equal state, so the panel could sit on "Loading news..." forever with the data already in memory. Whether you saw it depended on whether some unrelated state update happened to fire afterwards. |
| **#3, High** | The watchlist was in-memory only, while the README advertised localStorage persistence. |
| **#4, Medium** | `fetchStockDetails` has a random 500–2500ms delay and nothing tracked in-flight requests, so clicking A then B could leave A's details in the panel. |

## What I changed

### The safety net first

Unit tests served two different purposes, and they shifted over time. At the start they were purely a guard — I needed to catch it preventively if the refactoring broke something. Later they became the tool for locking down bugs, both the ones from my own audit and the ones that came out of code review.

Some of those tests are probably redundant now. Their job was to prove nothing broke, and that job is done. I could clean them out, but the project is small and I decided to leave them.

### ESLint

I used the linter to pull code style into something comfortable, plus a11y, cleaning out leftover code, potential issues with effect loops, hook dependencies, list keys, and so on — the rule set is based on the Vercel React best-practices skill.

The process of fixing lint errors pushed me into refactoring some parts along the way ([PR #2](https://github.com/ArtemParadise/fe-assignment/pull/2)). That's worth calling out: the linter wasn't just cosmetic here, it surfaced real problems.

### Decomposition

Then I went in deliberately, on my own judgment:

- **Split `StockList` into subcomponents** ([PR #3](https://github.com/ArtemParadise/fe-assignment/pull/3)). The main trade-off: more files and prop drilling (or pulling it together with context) against readability and testability of the individual pieces. Important detail — I carried the existing tests across rather than rewriting them, so they'd stay a reference point and a valid check.
- **Custom hooks** ([PR #4](https://github.com/ArtemParadise/fe-assignment/pull/4)). `useWatchlist`, `useStockFilters`, `useStockSort`, `useStockMetrics`, `useStockNews`, `useStockDetails`, plus a reusable `useClickOutside`.
- **Constants and utilities** ([PR #5](https://github.com/ArtemParadise/fe-assignment/pull/5)) — sort fields and a comparator lookup table instead of an if/else chain, volume formatting extracted out.
- **Semantics and accessibility** — ARIA roles on the grid and list items, proper labels on the watchlist buttons, a label on the sector select.
- **List keys** — replaced array indexes with stable ids.
- **Cleaned up the causes of error logs in tests** ([PR #6](https://github.com/ArtemParadise/fe-assignment/pull/6)).

`StockList` is now composition only — it wires hooks to components and holds no logic of its own.

### CI

Added a GitHub Actions workflow ([PR #7](https://github.com/ArtemParadise/fe-assignment/pull/7)): lint, tests, and build on every PR. Husky runs lint-staged on pre-commit and the full suite on pre-push, so the same gates apply locally.

## Tooling and process

**CodeRabbit worked out well.** Some of the bugs on my list got fixed on the fly through its review. I didn't need custom instructions — code style in my case is set by ESLint, and the repo's standards were still being formed as I went. On a large codebase custom instructions would be genuinely useful, to put the emphasis in the right places.

**On AI skills — I decided not to write my own.** `vercel-react-best-practices` was enough. It was useful both for preparing the ESLint rules and for the bug and improvement audits. I also used the `superpowers` skillset, installed globally on my machine.

I could have set up skills like "test changes", "audit issues", "audit improvements" and so on. I decided that would be overkill here. If further iterations and scaling were on the table, it would make sense.

**Validation.** After the final AI checks, analysis, and testing through Playwright, I compared against the original deployed alongside — the same way I'd diff local changes against a working environment.

## Staying inside the boundary

I was deliberately careful not to touch how the site works, following the brief — change nothing, break nothing.

Which makes the UI-visible changes the ones that need an argument. Every one of them is a case where a control already existed and was broken, or where documented behaviour didn't match reality. None of them add, remove, or redesign anything.

### UI/UX changes and why each one is in scope

**Responsive layout (#6).** `.sort-controls` didn't wrap at 400px, giving 143px of horizontal scroll across the whole page. Added `flex-wrap: wrap`. Not a redesign — same visuals, the buttons just stop running off the screen on narrow viewports.

**Company name spacing (#7).** `margin: 88px 0` created an empty hole on every card and was completely out of line with every other spacing value in the file (`8px` everywhere). Corrected to `8px`. This is a layout bug, not a design decision — so I decided to change to improve convenience.

**Details panel contrast (#12).** `#999` on an `#e9ecef` background, hard to read, plus two conflicting `.user-details p` rules that only worked because of cascade order. Merged into one rule, colour `#495057`. I considered this as a readability improvement rather than change of style.

**Volume / Avg Price spacing (#22).** Two `<small>` elements ran together into one string with no gap ("Volume: 7.0MAvg: 192.91"). `display: flex` + `gap` — fixes unreadability, layout is visually mostly the same but more convenient.

**"Hide News" button (#15).** It genuinely didn't close the panel — it was a no-op. Why this is UX and not a new feature: the button was already in the UI with that label and that expected behaviour. It just didn't work. Brought it up to what it already claimed to do.

**Search suggestions dropdown (#18, #19, #23).** Didn't close after picking a suggestion, after clearing the field, or when clicking outside the search. Also not new functionality — a bug in an existing search component whose behaviour was already implied, since the UI for hiding it existed and simply never fired.

**"Show News" hanging on "Loading…" (#2).** Because of the state object mutation, the re-render wasn't guaranteed. Without the fix some users would never see content that had already loaded — I considered this as a broken use case in an existing feature.

**Watchlist not persisting (#3).** The README (Original version) states persistence through localStorage outright; in fact there was none. The fix brings behaviour back in line with what was already claimed and expected — not a new feature, a correction of a documentation/reality mismatch.

**"Load Price History" showing nothing (#16).** The button was in the UI, the request genuinely fired, but the result went only to `console.log`. For the user the button was dead. Here I gave the fetched data a minimal render (a `date: price` list) so an existing interface element would stop being a no-op. This one is on the edge of "added a feature" — my argument is that the control was already in the UI promising a result, and I just finished what the code had already started.

## Ideas I rejected

**Splitting components and hooks into nested folders.** Right now it's 5 components and 7 hooks in a flat structure (`components/`, `hooks/`), and that reads at a glance. Nesting pays off when there are dozens of files and the flat list turns into a wall — here it's the opposite: it would add levels of navigation and imports for the sake of a structure there isn't yet volume for.

**Moving to TypeScript.** The value shows up at scale: a growing codebase, several developers, complex contracts between modules — that's when types pay for themselves. Within this assignment there isn't a single bug caused by the absence of types (every issue found is logic, effects, or CSS — not a type mismatch), so it'd be overhead without a return.

This is the call I'd most expect pushback on, and I think it's the right one for the scope. On a real product I'd argue the other way.

**Splitting CSS into per-component SCSS modules.** `App.css` is 345 lines for 6 components, ~20 `className` references in total, and I didn't see any actual class collisions — every CSS bug found was a specific broken rule (a stray `margin`, a missing `flex-wrap`, two conflicting selectors), not a consequence of global scope. Splitting into modules means rewriting `className` across all components and adding SCSS to the toolchain for a hypothetical problem, while carrying a risk of visual regression exactly where the brief explicitly requires not changing the design.

**Upgrading library versions.** Vite/Vitest and React aren't on the latest majors, but upgrading isn't part of the goal of this refactor (architecture, readability, correctness of the existing code) and adds its own separate risk: possible breaking changes in config or build that I'd be debugging instead of making more meaningful improvements.

## What I'd do next

Things I know are still open. None of them are large; they're where I'd start on the next pass.

- **No error boundary.** Issue #1 is fixed, but the structural reason it took the whole app down — nothing catches a render error anywhere in the tree — is still there.
- **No `React.StrictMode`.** Worth turning on to surface effect problems early.
- **Three unhandled rejections.** `useStockMetrics`, `useStockNews`, and `loadPriceHistory` in `useStockDetails` all chain `.then()` with no `.catch()`. Each one leaves a permanent "Loading…" if the request ever fails — the same failure shape as #17, which I did fix for `fetchStockDetails`.
- **`StockCard` conflates loading with empty.** `news.length === 0` renders "Loading news...", so a genuinely empty response would hang on that message forever.
- **`SearchBar` still keys suggestions by index**, which is the same thing I fixed in `StockList` under #11.
- **Surfacing fetch errors in the UI.** Right now `useStockDetails` only logs them. Doing this properly needs an error state in the panel, which is a UI addition the brief rules out — so it's listed here rather than done.
- **Dead CSS.** `.timer`, `.timer-display`, and `.counter` survived the removal of the timer feature.

At real scale — a live API instead of a mock, hundreds of rows instead of ten — the next steps would be different in kind: a data layer with request deduplication and caching (the same `fetchHistoricalPrices(symbol)` is currently called twice for the same symbol from two different places), memoisation driven by actual profiling, and list virtualisation. I deliberately didn't do any of that here. With 10 stocks and an in-memory mock, adding it would be cargo cult — there is currently no `useMemo`, `useCallback`, or `memo` anywhere in the codebase, and at this size that's the correct answer, not an oversight.

## Where things stand

- 132 tests, 16 files, all passing. 99.6% statement coverage.
- `npm run lint` clean.
- Lint, tests, and build run in CI on every PR; lint-staged on pre-commit, full suite on pre-push.
- 22 of 23 known issues fixed; the one left open ([#5](./docs/known-issues.md#issue-5-details-panel-values-are-unrelated-to-the-summary-card-for-the-same-symbol)) is a property of the mock data generator, not the app.
