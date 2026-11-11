# Implementation Plan: Automatic light/dark theme by time of day

**Branch**: feat/auto-theme-by-time | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

## Summary
Add an `auto | light | dark` mode on top of the existing `next-themes` setup. A pure module decides day/night from the local hour. An inline init script (before `next-themes`' own script) resolves the mode, and writes the resolved value into next-themes' `theme` storage key so its pre-paint script applies the right class with no flash. The header toggle becomes a three-way cycle; in Auto a client effect re-resolves at the next boundary, on `visibilitychange`, and on cross-tab `storage` events.

## Technical Context
TypeScript 5.1, Next.js 15 App Router, React 19, `next-themes` ^0.4.6 (kept), tsx node:test, Playwright with a fixed clock. No new dependencies. Storage: `localStorage["theme-mode"]` (new) and next-themes' existing `localStorage["theme"]`. Pages stay statically rendered.

## Constitution Check
PASS before and after design. I: spec precedes code. II: no content change. III: no-JS keeps today's dark design; keyboard/visible focus; both themes and all six seasons keep AA; checked at 390/768/1440. IV: no dependencies or layers; data/logic in `app/data/`, one client component, styling in `app/globals.css` only if needed. V: unit and browser regression, lint, tsc, build.
**Deliberate baseline change**: "dark default" becomes "auto by time" for first-time visitors with JavaScript; dark remains the no-JavaScript fallback. Documented in README, `docs/redesign-notes.md`, and `docs/rules/project-structure.md`.

## Project Structure
- `app/data/theme-schedule.ts` NEW pure rule, mode parsing, boundary timing, `themeInitScript` (Anvil)
- `tests/theme-schedule.test.ts` NEW (Anvil)
- `app/components/ThemeToggle.tsx` NEW replaces `DarkModeToggle.tsx` (Pixel)
- `app/components/Header.tsx`, `app/layout.tsx` EDIT (Pixel)
- `README.md`, `docs/redesign-notes.md`, `docs/rules/project-structure.md` EDIT (Pixel)
- `tests/theme.spec.ts` NEW; update `tests/blog.spec.ts` and `tests/season.spec.ts` for the new toggle; `playwright.config.ts` include (Echo)
- Feature docs under `specs/004-auto-theme-by-time/`.

## Phases
1. Contract (Atlas). 2. Pure module + unit tests (Anvil) in parallel with toggle/layout/docs (Pixel). 3. Integration gates (Atlas). 4. Browser tests and existing-test updates (Echo). 5. Independent review (Sage). 6. Evidence, Graphify refresh, PR.

## Complexity Tracking
No violations. The inline pre-paint script mirrors the existing season script and `next-themes` technique.
