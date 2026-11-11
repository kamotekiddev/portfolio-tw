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

Recorded 2026-11-11 on `feat/auto-theme-by-time` after the follow-up work (mode label, icon plus Auto badge, icon animation, season toggle).

| Check | Result |
|-------|--------|
| `npm run lint` | No ESLint warnings or errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run test:blog` | 60 passed, 0 failed (theme-schedule 21, seasons 18, blog and content tests) |
| `npm run build` | Passes; all routes still static / SSG |
| `npm run test:blog:e2e` | 304 passed in 2.9 min (season, theme, blog projects), Chromium |
| `git diff --check` | Clean |

- **Automatic theme (FR-001 to FR-011, SC-001 to SC-006)**: first commit, evidence unchanged; re-verified by the final full run.
- **FR-005 (toggle)**: the button always shows the current theme's icon (sun or moon) and, only in Auto, a small "A" badge; 2 icons before hydration with CSS choosing by the `<html>` class, exactly 1 after mount.
- **FR-012 / SC-007 (visible mode label)**: flat accent pill, `Auto · light now` / `Auto · dark now` / `Light` / `Dark`; hover, keyboard focus and about 2 s after each press; never on load; one label at a time across both toggles; contrast at least 5.8:1 in all 12 season x theme combinations.
- **FR-013 (icon animation)**: 220 ms turn-and-scale on mode changes after mount only; none on load, navigation, the automatic flip, or with reduced motion.
- **Season toggle (spec 003 FR-017, FR-018)**: single press cycles only the seasons available in the region (spring, summer, autumn, winter, or wet and dry), returning to Automatic on the current season; hidden where no season is detected; stale stored seasons ignored in both the component and the pre-paint script; icon, Auto badge, label, animation, cross-tab and blocked-storage fallback covered by tests.
- **Review fixes**: first paint with blocked storage; Auto users pinned after storage clear; manual choice lost on navigation with blocked storage; redundant `data-season` rewrite on every mount (found by Echo, fixed).

### Not verified

- Chromium only: no Firefox, WebKit, real devices, or screen reader.
- Real-time behaviour (a real tab left in the background across 06:00 or 18:00) was simulated with a fake clock and dispatched events.
- At 390 px a label overlaps part of the second-row nav for up to 2 s after a press; taps pass through (accepted).
- The season control cannot preview seasons that do not exist in the visitor's region; changing the device time zone is the only way.
- The independent review (Sage) covered the first commit; the later follow-up work (label, badge, animation, season toggle) had Echo's QA run but no separate independent code review.
- Month-boundary changes while a page stays open do not update the season live (re-derived on each load).
