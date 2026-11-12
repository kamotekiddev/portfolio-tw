# Tasks: Highlight the current navigation item

Owners: Atlas (lead), Pixel (UI), Echo (tests), Sage (review). `[P]` = parallel.

- [x] T001 Branch `006-active-nav-highlight` from fresh `origin/main`; spec and plan (Atlas)
- [x] T002 [P] `MainNav.tsx`, `Header.tsx`, nav current styles, structure doc (Pixel): FR-001–FR-006
- [x] T003 [P] `tests/nav.spec.ts` plus Playwright project (Echo): FR-007, SC-001–SC-003
- [x] T004 Integrate: lint, tsc, `npm run test:blog`, build, full Playwright (Atlas): SC-004
- [x] T005 Independent review (Sage); route findings
- [x] T006 Evidence, status, `graphify update .`, open PR (Atlas)

## Acceptance evidence

Recorded 2026-11-12 on `006-active-nav-highlight` with the combined code.

| Check | Result |
|-------|--------|
| `npm run lint` | No ESLint warnings or errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run test:blog` | 60 passed, 0 failed |
| `npm run build` | Compiled successfully; 14 static pages |
| `npx playwright test --project=nav` | 49 passed |
| `npx playwright test` (all projects) | 369 passed, 0 failed (4.7 min) |
| `git diff --check` | Clean |

- **Blog (FR-001, SC-002)**: Blog is the only `aria-current="page"` link on `/blog` and articles, in the served HTML, with JavaScript disabled, and after hydration. Unknown blog URLs and `/nope` render the site 404 with nothing current and no hydration errors.
- **Scroll-spy (FR-002, FR-003, SC-001)**: at 390, 768 and 1440 px, nothing is current at the hero. Each section becomes current at the line, scrolling both ways. Contact is current at the bottom, including at 1440×2000. Hash loads and clicks settle on the target at 667×375 and 390×844. A per-frame sampler shows no flash of the previous section. Back/forward and client-side navigation work. Malformed hashes (`/#%` and others) raise no errors.
- **Style and a11y (FR-004, FR-006, SC-003)**: accent plus persistent underline, at least 4.5:1 in 12 theme × season combinations (minimum 5.34:1, light summer). No change to boxes, size, weight or header height. Tab order and focus ring unchanged. No transition with reduced motion.
- **Review (T005)**: Sage's five findings were fixed: malformed-hash crash, short-viewport settling, release flicker, blog ownership via a layout prop, and the tall-viewport bottom rule. Blog 404 behaviour is recorded in FR-001.
