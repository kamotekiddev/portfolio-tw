# Implementation Plan: Circle-reveal theme transition

**Spec**: [spec.md](spec.md) · **Contract**: [contracts/theme-transition-contract.md](contracts/theme-transition-contract.md)

## Approach
A small client helper, `runThemeTransition(origin, update)`, wraps visitor-started changes in
`document.startViewTransition`. Once the transition is ready, it animates `clip-path: circle()` on
`::view-transition-new(root)` from the pressed control to the farthest viewport corner. Two
global CSS rules turn off the default crossfade. `ThemeToggle` and `SeasonPicker` call the helper
from their activation handlers only. Automatic paths keep calling `apply` / `applySeason` directly,
so they stay instant (FR-004).

`next-themes` applies the class in an effect after `setTheme`. The callback therefore runs the state
update inside `flushSync`, so the class is on `<html>` before the browser captures the new snapshot.
If verification shows the class is not applied in time, the fallback is to set the class on
`document.documentElement` directly inside the callback, before `setTheme`.
`disableTransitionOnChange` stays: its `*` rule does not match view-transition pseudo-elements, and it
still stops colour transitions from blending into the snapshot.

## Constitution check
- I Spec first: spec, contract and tasks precede code. ✔
- II Content: no content changes. ✔
- III Accessible/progressive: reduced motion and unsupported browsers get the instant switch; no-JS unchanged; focus and names unchanged; checked at 390, 768 and 1440 px. ✔
- IV Simple architecture: one helper file in `app/components/`, no dependency, styles in `globals.css`. ✔
- V Verification: lint, tsc, unit tests, build, Playwright regression for FR-010. ✔

## Files and owners
| File | Owner |
|------|-------|
| `app/components/theme-transition.ts` (new) | Pixel |
| `app/components/ThemeToggle.tsx`, `app/components/SeasonPicker.tsx` | Pixel |
| `app/globals.css` (view-transition rules only) | Pixel |
| `docs/rules/project-structure.md`, README theme note | Pixel |
| `tests/theme-transition.spec.ts` (new), `playwright.config.ts` project entry | Echo |
| Review | Sage |
| Spec, integration, evidence, `graphify update .` | Atlas |

## Risks
- Snapshot timing with `next-themes` (mitigated by `flushSync`, with a fallback described above).
- The sticky header and the fixed particle layer are part of the root snapshot. They are revealed together with the page, which is intended.
- View Transitions are not available everywhere. Unsupported browsers fall back to the instant switch.
