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

## Follow-up: visible mode label (FR-012, SC-007)

- [x] T012 Pixel: label markup and logic in `app/components/ThemeToggle.tsx`, styles in `app/globals.css`, doc note in README
- [x] T013 Echo: browser tests for hover, focus, post-activation timing, text per mode, no overflow at 390/768/1440, both themes, touch (tap) path, no interference with the season menu
- [x] T015 Season control becomes a single-press toggle limited to the region's seasons, with the current-season icon, Auto badge, label and animation (spec 003 FR-017, FR-018): Anvil (seasons.ts, init script, unit tests), Pixel (component, styles, README), Echo (rewrite picker tests)
- [x] T014 Integration gates, review, evidence update

## Acceptance evidence

Recorded 2026-11-11 on `feat/auto-theme-by-time` after the final follow-ups (free-choice season menu, theme toggle flip).

| Check | Result |
|-------|--------|
| `npm run lint` | No ESLint warnings or errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run test:blog` | 60 passed, 0 failed (theme-schedule 24, seasons 15, blog and content tests) |
| `npm run build` | Passes; all routes still static / SSG |
| `npm run test:blog:e2e` | 320 passed in 3.6 min (season, theme, blog projects), Chromium |
| `git diff --check` | Clean |

- **Automatic theme (FR-001 to FR-011, SC-001 to SC-006)**: unchanged behaviour, re-verified by the final full run.
- **Theme toggle flip (FR-005, SC-003)**: a press selects the opposite of the shown theme; landing on the theme the time of day calls for means Auto, so the toggle alternates between Auto and the opposite theme. Truth table for day and night, the 06:00 and 18:00 edges, stored manual modes, reload persistence and persistence across the boundary are covered by unit and browser tests.
- **FR-012 / SC-007 (visible label)**, **FR-013 (icon animation)**, **FR-005 icon and badge**: current theme's icon with the Auto "A" badge, accent pill label, 220 ms icon animation only on mode changes after mount; both toggles, one label at a time.
- **Season menu (spec 003 FR-017, FR-019)**: free choice of all six seasons in every region; the detected season's row carries an "Automatic" tag and choosing it stores `auto`; an extra first "Automatic" item where no season is detected; flat design-system styling (no border, shadow or gradient; accent pill for the selected row); contrast at least 5.81:1 across 12 season x theme combinations; keyboard, labels, animation, cross-tab and blocked-storage fallback covered.
- **History**: the region-limited single-press season toggle (FR-018) was built, tested and then superseded by FR-019 at the owner's request; its spec text remains for the record.
- **Review fixes**: first paint with blocked storage; Auto users pinned after storage clear; manual choice lost on navigation with blocked storage; redundant `data-season` rewrite on mount.

### Not verified

- Chromium only: no Firefox, WebKit, real devices, or screen reader.
- Real-time behaviour (a real tab left in the background across 06:00 or 18:00) was simulated with a fake clock and dispatched events.
- At 390 px a label or the open season menu overlaps part of the second-row nav; taps pass through labels.
- In light themes the menu panel's edge is soft because `--surface` is close to the page ground (no border or shadow by design).
- The independent review (Sage) covered the first commit only; later work had Echo's QA but no separate independent code review.
- Month-boundary changes while a page stays open do not update the season live (re-derived on each load).
- Storage cleared in the same tab does not update that tab (a tab receives no storage event for its own change).
