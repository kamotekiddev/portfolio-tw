# Implementation Plan: Seasonal theme

**Branch**: `feat/seasonal-theme` | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-seasonal-theme/spec.md`

## Summary

Pick one of six seasons from the visitor's device time zone and local month, expose it as a
`data-season` attribute on `<html>`, and let CSS do the rest: per-season accent tokens for both
themes and a CSS-only ambient layer. A small inline script sets the attribute before first paint;
a header picker stores an `auto | <season>` preference in `localStorage`. With no attribute
(no scripts, unrecognised zone) the existing emerald design renders unchanged.

## Technical Context

**Language/Version**: TypeScript 5.1, React 19, Next.js 15 App Router

**Primary Dependencies**: existing only — Tailwind 4 / `app/globals.css`, `next-themes`, `react-icons`. No new dependencies.

**Storage**: `localStorage` key `season` on the visitor's device. No server storage.

**Testing**: `tsx --test tests/*.test.ts` (node:test) for season logic; Playwright (`npm run test:blog:e2e`) for browser behaviour, using `timezoneId` and a fixed clock.

**Target Platform**: evergreen browsers; statically rendered pages on the existing host.

**Project Type**: web application (single Next.js app).

**Performance Goals**: ambient layer animates `transform`/`opacity` only, at most 18 elements; inline init script at most 4 KB uncompressed.

**Constraints**: pages stay statically rendered; no network or permission use for detection; no layout shift; content usable without JavaScript.

**Scale/Scope**: one data module, two shared components, root layout, header, global styles, two test files, docs.

## Constitution Check

*GATE: evaluated before research and again after design — PASS both times.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specifications lead | PASS | Spec with clarifications precedes code; tasks trace to FR/SC ids. |
| II. Factual content | PASS | No portfolio claims, links, or imagery change. Tropical month ranges are labelled generalisations. |
| III. Accessible, progressive | PASS | No-JS and unknown-zone fallback is today's design; picker is keyboard/screen-reader operable; ambient layer is `aria-hidden`, non-interactive, off under reduced motion; AA contrast for 12 palette combinations; checks at 390/768/1440. |
| IV. Simple architecture | PASS | No dependencies, services, or layers. Season data in `app/data/`; styles in `app/globals.css`; one client component (picker) because it needs browser storage. Ambient layer is server-rendered markup driven by CSS. |
| V. Verification matches change | PASS | Unit + browser regression, lint, tsc, build, responsive browser review. |

**Documented baseline change**: `docs/redesign-notes.md` fixes "type and nothing else" and
charcoal/emerald. This feature deliberately adds seasonal accents and a restrained ambient layer.
Emerald remains the fallback and is the spring palette. The notes are updated in this work.

## Project Structure

### Documentation (this feature)

```text
specs/003-seasonal-theme/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/season-contract.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
app/data/seasons.ts               NEW  Season data, pure detection functions, init script source   (Anvil)
tests/seasons.test.ts             NEW  Season table, fallback, preference parsing, init script     (Anvil)
app/components/SeasonPicker.tsx   NEW  Client header control: auto + six seasons                   (Pixel)
app/components/SeasonAmbient.tsx  NEW  Server-rendered decorative particle markup                  (Pixel)
app/components/Header.tsx         EDIT Mount the picker beside the theme toggle                    (Pixel)
app/layout.tsx                    EDIT Inline init script; mount ambient layer                     (Pixel)
app/globals.css                   EDIT Season tokens, picker styles, ambient keyframes             (Pixel)
docs/redesign-notes.md            EDIT Record the seasonal direction change                        (Pixel)
tests/season.spec.ts              NEW  Browser regression                                          (Echo)
playwright.config.ts              EDIT Include the new spec                                        (Echo)
docs/rules/project-structure.md   EDIT Folder map                                                  (Atlas)
README.md                         EDIT One-line feature note                                       (Atlas)
```

**Structure Decision**: follow the existing layout — data in `app/data/`, shared UI in
`app/components/`, styles in `app/globals.css`, tests in `tests/`. No new folders.

## Phases

1. **Contract** (Atlas): `contracts/season-contract.md` fixes the module API, DOM attribute, and storage key.
2. **Season logic + unit tests** (Anvil) and **UI: tokens, picker, ambient, init wiring** (Pixel) in parallel against the contract; files do not overlap.
3. **Integration** (Atlas): lint, tsc, build, unit tests on the combined tree.
4. **Browser regression and responsive/contrast/no-JS/reduced-motion checks** (Echo).
5. **Independent review** (Sage); findings routed back to the owning implementer.
6. **Docs, evidence, Graphify refresh** (Atlas).

## Complexity Tracking

No constitution violations. One justified addition: an inline pre-paint script in the root layout
(required by FR-010; same technique `next-themes` already uses for the dark/light class).
