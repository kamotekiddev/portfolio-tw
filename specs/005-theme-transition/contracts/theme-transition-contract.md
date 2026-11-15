# Contract: `runThemeTransition`

File: `app/components/theme-transition.ts` (client-only helper; no React state, no dependency).

```ts
export const THEME_REVEAL_MS = 500;

/**
 * Applies `update` with a circle reveal centred on `origin`.
 * - Calls `update` synchronously and returns without animation when `origin` is null,
 *   `document.startViewTransition` is missing, or `prefers-reduced-motion: reduce` matches.
 * - Otherwise skips any running theme transition, then calls
 *   `document.startViewTransition(() => flushSync(update))`. When `ready` resolves, it animates
 *   `clip-path` on `::view-transition-new(root)` from `circle(0 at x y)` to `circle(r at x y)`,
 *   where (x, y) is the origin's centre in viewport pixels and r is the distance to the
 *   farthest viewport corner. It uses THEME_REVEAL_MS and the site ease-out curve
 *   `cubic-bezier(0.22, 1, 0.36, 1)`.
 * - The DOM change (class or data-season) MUST have happened by the time the callback returns.
 * - Rejections from `ready` and `finished` are swallowed. A skipped transition still applies `update`.
 * - Before skipping a running reveal, its clip-path Animation is cancelled (avoids a Chromium 158 crash).
 * - While a reveal runs, capture-phase window `pointerdown` skips it and a `click` targeted at <html>
 *   is stopped and replayed (focus, then `.click()`) on the interactive element under the pointer once
 *   the transition finishes. Listeners exist only while a reveal runs or a click is awaited.
 */
export function runThemeTransition(origin: HTMLElement | null, update: () => void): void;
```

Callers:
- `ThemeToggle` click handler: computes `next` from `sessionMode ?? current` (updated synchronously), calls
  `writeMode(next)`, then `runThemeTransition(event.currentTarget, () => { setMode(next); apply(next); })`.
  `showLabel()` and `sessionMode` stay outside the callback. Automatic `apply` calls are not wrapped.
- `SeasonPicker.choose`: wraps only `setApplied(applySeason(next))` and `setMode(next)`, with the
  trigger button as origin. Skip the reveal when the resolved season does not change. Storage writes,
  `close(true)` (focus return) and `showLabel()` stay outside, so focus handling is unchanged.

CSS (`app/globals.css`):
```css
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
```
The new snapshot sits above the old one by default, so no z-index rules are needed. No other
`view-transition-name` is introduced.
