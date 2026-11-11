# Tasks: Automatic light/dark theme by time of day

Owners: Atlas (lead), Anvil (logic), Pixel (UI/docs), Echo (tests), Sage (review). `[P]` = parallel.

- [x] T001 Branch `feat/auto-theme-by-time` from fresh `origin/main` (Atlas)
- [x] T002 Spec, plan, contract (Atlas)
- [x] T003 [P] `app/data/theme-schedule.ts` per contract (Anvil) — FR-001–004, FR-007
- [x] T004 [P] `tests/theme-schedule.test.ts`: 24-hour table, boundaries, mode parsing, `nextThemeMode`, `msUntilNextThemeChange` incl. DST-safe cases, init-script parity in a `node:vm` sandbox incl. legacy migration and throwing storage (Anvil) — FR-011, SC-001
- [x] T005 [P] `ThemeToggle.tsx` replacing `DarkModeToggle.tsx`; update `Header.tsx` (Pixel) — FR-005, FR-006, FR-008
- [x] T006 Inline `themeInitScript` in `app/layout.tsx` before the ThemeProvider script (Pixel) — FR-004, FR-009, FR-010
- [x] T007 [P] Update README, `docs/redesign-notes.md`, `docs/rules/project-structure.md` for the deliberate dark-default change (Pixel)
- [x] T008 Integrate: lint, tsc, `npm run test:blog`, build (Atlas)
- [x] T009 `tests/theme.spec.ts` and update `tests/blog.spec.ts`, `tests/season.spec.ts` for the three-way toggle; fixed clock for first paint, persistence, cycling, live switching, legacy migration, cross-tab, no-JS, no overflow (Echo) — FR-011, SC-002–SC-006
- [x] T010 Independent review (Sage); route findings to owners
- [x] T011 Record evidence below, mark tasks, `graphify update .` (Atlas)

## Acceptance evidence

Recorded 2026-11-11 on the uncommitted `feat/auto-theme-by-time` tree, after review fixes.

| Check | Result |
|-------|--------|
| `npm run lint` | No ESLint warnings or errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run test:blog` | 52 passed, 0 failed (21 theme-schedule tests, 10 season tests, existing blog tests) |
| `npm run build` | Passes; all routes still static / SSG |
| `npm run test:blog:e2e` | 200 passed in 1.8 min (season, theme, blog projects), Chromium |
| `git diff --check` | Clean |

- **SC-001**: all 24 hours, the 06:00 and 18:00 edges, other time zones, and a DST-gap case (Antarctica/Casey) in unit and browser tests.
- **SC-002 / FR-004**: the html class is correct at first paint in every mode, with and without external scripts, on home, blog, an article and a 404; a negative control shows the sensor can fail. Served HTML order checked: theme script, then season script, then next-themes.
- **SC-003 / FR-005**: each mode is reachable in at most two activations and survives reload; names, icons and keyboard operation verified.
- **SC-004 / FR-008**: live flip within 1 second at 18:00 and 06:00 with a fake clock; Light and Dark never change; visibility, focus and cross-tab sync covered.
- **SC-005 / FR-010**: season contrast test unchanged and passing; season behaviour, metadata and social preview untouched.
- **SC-006**: no overflow at 390, 768 and 1440 in both themes; controls usable.
- **FR-007 / FR-009**: 21 legacy and invalid storage cases; no JavaScript shows dark with full content.
- **Independent review (Sage)**: no blockers. Fixed: first paint with blocked storage now sets the class directly; clearing storage while a tab is open no longer pins Auto users to Light or Dark (the toggle writes `theme-mode` before every apply and the legacy rule is one shared function); a manual choice survives client-side navigation when storage is blocked (found by Echo).

### Not verified

- Chromium only: no Firefox or WebKit, no real devices, no screen reader.
- Real-time behaviour: a real tab left in the background across 06:00 or 18:00, throttled timers, and real system-clock changes were simulated with a fake clock and dispatched events, not observed.
- With storage blocked, one corrected frame after hydration is accepted (spec assumption); a second open tab cannot follow a change in that mode.
- Storage cleared in a tab that is in Light or Dark mode (that tab receives no storage event for its own clear) was not tested.
