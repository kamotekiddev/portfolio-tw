# Tasks: Seasonal theme

**Input**: `specs/003-seasonal-theme/` — spec.md, plan.md, research.md, data-model.md, contracts/season-contract.md

Owners: Atlas (lead), Anvil (logic), Pixel (UI), Echo (verification), Sage (review).
`[P]` = can run in parallel (different files, no dependency).

## Phase 1: Setup

- [x] T001 Create branch `feat/seasonal-theme` from freshly fetched `origin/main` (Atlas)
- [x] T002 Fix the shared interface in `specs/003-seasonal-theme/contracts/season-contract.md` (Atlas)

## Phase 2: Foundational (blocks all stories)

- [x] T003 [P] Implement season data, region-band table, pure functions, and `seasonInitScript` in `app/data/seasons.ts` per the contract (Anvil) — FR-001, FR-002, FR-003, FR-014
- [x] T004 [P] Add `tests/seasons.test.ts`: 48 band×month combinations, representative zones per band, unknown/UTC fallback, preference parsing, and init-script parity in a `node:vm` sandbox (Anvil) — FR-016, SC-001

## Phase 3: User Story 1 — See the portfolio in my current season (P1)

**Independent test**: set device zone/date, load any page, season matches the table in both themes.

- [x] T005 [P] [US1] Add per-season accent tokens for light and dark in `app/globals.css`, leaving the no-attribute emerald design untouched; spring reuses emerald (Pixel) — FR-004, FR-005, FR-006
- [x] T006 [US1] Inline `seasonInitScript` before first paint in `app/layout.tsx` (Pixel) — FR-007, FR-010
- [x] T007 [US1] Verify contrast for all 12 palette combinations and record the ratios in `specs/003-seasonal-theme/quickstart.md` evidence (Pixel computes, Echo confirms) — SC-002

## Phase 4: User Story 2 — Choose a season myself (P2)

**Independent test**: keyboard-only, choose each season, reload, choice persists; Automatic restores detection.

- [x] T008 [P] [US2] Build `app/components/SeasonPicker.tsx` per the contract's DOM and storage rules (Pixel) — FR-008, FR-009
- [x] T009 [US2] Mount the picker in `app/components/Header.tsx` and style it in `app/globals.css` so the header fits at 390 px (Pixel) — FR-008, SC-006

## Phase 5: User Story 3 — Subtle seasonal atmosphere (P3)

**Independent test**: each season shows its ambient effect behind content; none under reduced motion.

- [x] T010 [P] [US3] Add `app/components/SeasonAmbient.tsx` (server component, `aria-hidden`, empty spans) and mount it once in `app/layout.tsx` (Pixel) — FR-011
- [x] T011 [US3] Add ambient keyframes per season in `app/globals.css`: transform/opacity only, `pointer-events: none`, behind content, hidden with no season and under reduced motion (Pixel) — FR-011, FR-012, FR-013

## Phase 6: Verification and polish

- [x] T012 Integrate: `npm run lint`, `npx tsc --noEmit`, `npm run test:blog`, `npm run build` on the combined tree (Atlas) — Constitution V
- [x] T013 Add `tests/season.spec.ts` and include it in `playwright.config.ts`: detection by `timezoneId` + fixed clock, unknown-zone fallback, picker persistence and Automatic, attribute present before hydration, reduced motion, no-JS content, no overflow at 390/768/1440 (Echo) — FR-016, SC-001, SC-003–SC-007
- [ ] T014 Browser review at 390/768/1440 in both themes across all seasons; keyboard and screen-reader naming of the picker; scroll smoothness with the ambient layer (Echo) — SC-005, SC-006, SC-008
- [x] T015 Independent review of the combined diff (Sage); route findings to the owning implementer
- [x] T016 [P] Record the seasonal direction change in `docs/redesign-notes.md` (Pixel)
- [x] T017 [P] Update the folder map in `docs/rules/project-structure.md` and add a feature note to `README.md` (Atlas)
- [x] T018 Record acceptance evidence below, mark tasks complete, run `graphify update .` (Atlas)

## Dependencies

T002 → T003, T004, T005, T008, T010. T003 → T006 and T008 type-check. T005–T011 → T012 → T013, T014 → T015 → T018.
Anvil (T003–T004) and Pixel (T005–T011, T016) run in parallel; their files do not overlap.

## Acceptance evidence

Recorded 2026-11-11 on the uncommitted `feat/seasonal-theme` tree, after review fixes.

| Check | Result |
|-------|--------|
| `npm run lint` | No ESLint warnings or errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run test:blog` | 31 passed, 0 failed (10 season tests: 48 band×month table, zones, fallbacks, preference parsing, init-script parity) |
| `npm run build` | Passes; `/`, `/blog`, `/_not-found`, `/robots.txt`, `/sitemap.xml`, `/social-preview` static, `/blog/[slug]` SSG |
| `npm run test:blog:e2e` | 73 passed in 1.0 min (63 season, 10 blog), Chromium |
| `git diff --check` | Clean |

- **SC-001**: unit table (48/48) plus browser detection for all four bands across twelve months and month boundaries.
- **SC-002**: contrast table in [quickstart.md](quickstart.md); asserted from live computed styles in the browser suite.
- **SC-003–SC-007**: covered by `tests/season.spec.ts` (picker persistence and keyboard path, no attribute rewrite during hydration, reduced motion, no overflow at 390/768/1440 in both themes, scripts disabled).
- **FR-015**: `app/social-preview/`, metadata, and `ThemeProvider` props are untouched in the diff.
- **Independent review (Sage)**: no blockers. Fixed: season menu clipped below about 340 px (now spans x 20–248 at 320 px, checked in Chromium); Tab out of the open menu now focuses the button first so focus continues from a live element. Not adopted: alias map for slash-less legacy zone names (they fall back to emerald), cross-tab sync.

### Not verified

- **T014 is incomplete.** The exploratory QA pass was interrupted twice by usage limits and never reported. Not done: real screen reader, Firefox and WebKit, scroll smoothness on a real mid-range phone (SC-008), CPU-throttled frame measurements.
- Zone latitudes were classified from memory and cross-checked by review for consistency, not against a gazetteer.
- Two earlier combined browser runs each had one timeout in a different test. The system power log showed the laptop entering maintenance sleep mid-run; the run above was made with sleep prevented.
