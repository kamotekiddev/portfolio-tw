# Tasks: Circle-reveal theme transition

Owners: Atlas (lead), Pixel (UI), Echo (tests), Sage (review). `[P]` = parallel.

- [x] T001 Branch `005-theme-transition` from fresh `origin/main` (Atlas)
- [x] T002 Spec, plan, contract, checklist (Atlas)
- [x] T003 [P] `app/components/theme-transition.ts` per contract; view-transition CSS in `app/globals.css` (Pixel): FR-001–FR-003, FR-005, FR-006, FR-009
- [x] T004 Wire `ThemeToggle` click and `SeasonPicker.choose` to the helper; automatic paths untouched; doc notes (Pixel): FR-001, FR-002, FR-004, FR-007, FR-008
- [x] T005 [P] `tests/theme-transition.spec.ts` plus Playwright project entry (Echo): FR-010, SC-001–SC-004
- [x] T006 Integrate: lint, `npx tsc --noEmit`, `npm run test:blog`, build, full `npm run test:blog:e2e` (Atlas): SC-005
- [x] T007 Independent review (Sage); route findings to owners
- [x] T008 Record evidence below, mark tasks, update spec status, `graphify update .` (Atlas)

## Acceptance evidence

Recorded 2026-11-12 on `005-theme-transition` with the combined code.

| Check | Result |
|-------|--------|
| `npm run lint` | No ESLint warnings or errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run test:blog` | 60 passed, 0 failed |
| `npm run build` | Compiled successfully; 13/13 static pages |
| `npx playwright test --project=theme-transition` | 27 passed (bundled Chromium 158) |
| `npx playwright test` (all projects) | 347 passed, 0 failed (5.9 min) |
| `git diff --check` | Clean |

- **Reveal (FR-001–FR-003, SC-002)**: origin is the pressed control's centre (±2 px), the radius reaches the farthest viewport corner at 390, 768 and 1440 px, 500 ms with the site ease-out curve, DOM already changed inside the callback (`flushSync` suffices), and a real un-instrumented run completes without console errors.
- **No animation (FR-004, FR-005, SC-003)**: reduced motion, missing API, first load, reload, client-side navigation, Auto 06:00/18:00 and visibility re-syncs, and other-tab changes all switch instantly.
- **Rapid presses and swallowed clicks (FR-006, SC-004)**: 5 real mouse clicks 80 ms apart, 5 unwaited Enter presses, 4-press even bursts, and a nav link clicked 100 ms into a reveal all land correctly.
- **Review (T007)**: Sage found no blocking issue; the swallowed-click finding (medium), stale-mode, delayed-storage and season-label findings were fixed by Pixel. Remaining items are listed under Known limitations in spec.md.
- **Existing suites**: six spec-003/004 tests assumed an instant commit or a hit-testable button mid-change. Four icon-animation tests now opt out of View Transitions (`noViewTransitions`) to test FR-013 in isolation; two wait for the one-frame commit. No assertions were relaxed.
