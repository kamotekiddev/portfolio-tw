# Contract: theme modes, storage, toggle

Shared by Anvil (logic), Pixel (UI), Echo (tests). Change only through Atlas.

## Module `app/data/theme-schedule.ts` (import `@/data/theme-schedule`)
Pure and isomorphic: no React/Next/`server-only`/`"use client"`; no top-level `window`/`document`/`localStorage`.
```ts
export const THEME_MODES = ["auto", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = "light" | "dark";
export const THEME_MODE_STORAGE_KEY = "theme-mode";
export const NEXT_THEMES_STORAGE_KEY = "theme";   // next-themes' key (unchanged)
export const DAY_START_HOUR = 6;                    // light from 06:00
export const DAY_END_HOUR = 18;                     // dark from 18:00
export const THEME_MODE_LABELS: Record<ThemeMode, string>; // Auto, Light, Dark

export function themeForHour(hour: number): ResolvedTheme;   // 6..17 light, else dark; invalid/non-integer hour -> "dark"
export function resolveTheme(mode: ThemeMode, date: Date): ResolvedTheme; // auto uses date.getHours()
export function parseThemeMode(value: unknown): ThemeMode | null;        // exact "auto"|"light"|"dark", else null
export function nextThemeMode(mode: ThemeMode): ThemeMode;               // auto->light->dark->auto
export function resolveStoredMode(storedMode: unknown, legacyTheme: unknown): ThemeMode; // valid storedMode wins; else legacyTheme exactly "light"|"dark"; else "auto" (the single source of truth for the legacy rule)
export function msUntilNextThemeChange(date: Date): number;               // ms to next local 06:00 or 18:00 boundary, always > 0
export const themeInitScript: string;                                     // self-contained ES5 IIFE, never throws, <= 2048 chars
```
`msUntilNextThemeChange` builds the target from local calendar fields (`new Date(y, m, d, h)`). Amended after implementation: when a DST gap makes that target unreachable (for example Antarctica/Casey on 2018-10-07), it searches for the first instant whose local date and hour reach the boundary, so the value is always positive and lands on the real flip; a repeated hour resolves to its first occurrence. Invalid or non-Date input returns 60000.

## Init script behaviour (must agree with the pure functions for every input)
1. `mode = parseThemeMode(localStorage["theme-mode"])` inside try.
2. If `mode` is null: `legacy = localStorage["theme"]`; if exactly `"light"` or `"dark"` then `mode = legacy` (explicit legacy choice), else `mode = "auto"`. Write `mode` to `theme-mode` (try/catch).
3. `resolved = mode === "auto" ? themeForHour(new Date().getHours()) : mode`.
4. Write `resolved` to `localStorage["theme"]` (try/catch) so next-themes' pre-paint script applies it.
4b. Independently of storage (so a blocked or throwing `localStorage` still paints the right theme): set the resolved class on `document.documentElement` (remove the other of `light`/`dark`, add the resolved one) and set `style.colorScheme` to it, inside try/catch. With blocked storage, one corrected frame after hydration is accepted (next-themes starts from `defaultTheme`); the spec records this.
5. Never throw. Must run **before** the next-themes script (first child of `<body>`, ahead of the season script is fine).

## Provider
`ThemeProvider` props stay `attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange`. `<html className="dark">` stays (no-JS fallback).

## Toggle (`app/components/ThemeToggle.tsx`, default export, replaces `DarkModeToggle`)
- Button class `theme-toggle`, disabled until mounted; click calls `nextThemeMode`, writes `theme-mode`, and calls next-themes `setTheme(resolveTheme(mode, new Date()))`.
- Accessible name: `Theme: Auto (currently light)`, `Theme: Auto (currently dark)`, `Theme: Light`, `Theme: Dark`. Name before mount: `Theme: Auto`.
- Icons (`aria-hidden`, amended 2026-11-11 at the owner's request): the button always shows the CURRENT resolved theme's icon, `FiSun` when light and `FiMoon` when dark (`react-icons/fi`), in every mode. In Auto only, a small badge `span.theme-toggle-badge` (`aria-hidden="true"`, text/glyph "A") sits on the icon's bottom-right corner, overlapping the circle's edge: a flat circle of about 16 px, `--accent` fill with `--on-accent` text, Geist weight 600 at about 10 px (a glyph size, not a body type step), no border or shadow, never intercepting pointer events, inside the 44 px button bounds so it cannot cause overflow. Light and Dark render no badge element at all. Before hydration (mode unknown) render BOTH icons plus the badge and let CSS show the one matching the `<html>` class (`.light` shows the sun, otherwise the moon, so no-JS shows the moon and a daytime load never swaps moon to sun at hydration); after mount render exactly ONE icon that follows the resolved theme. So the button holds 2 svgs before hydration and exactly 1 after mount. On hover-capable devices the badge inverts its colours (`--on-accent` fill, `--accent` letter) so it stays visible on the accent hover fill. The accessible name is unchanged (`Theme: Auto (currently light)` etc.); the badge adds no announcement. The icon swap at the automatic 06:00/18:00 flip is instant (no animation, FR-013 unchanged).
- In Auto: `setTimeout(msUntilNextThemeChange(now) + 250)` re-resolves and re-arms; also re-resolves on `document.visibilitychange` (visible) and `window` `focus`. In Light/Dark no timers.
- Re-reads the mode on `window` `storage` events for `theme-mode`/`theme` so other tabs follow.
- Reading the mode: `resolveStoredMode(localStorage["theme-mode"], localStorage["theme"])` (errors → `auto`). Whenever the toggle applies a theme it also writes `theme-mode` first, so a clock-written `theme` can never be mistaken for a legacy explicit choice (amended after review: storage cleared while a tab is open must leave Auto users on Auto).

## Mode label (FR-012, added 2026-11-11)
- Markup: the toggle sits in a wrapper `div.theme-toggle-wrap` (position: relative) with a sibling `span.theme-toggle-label` (`aria-hidden="true"`, `pointer-events: none`, never focusable). The button keeps class `theme-toggle`, its accessible name, and its icons unchanged.
- Text: `Auto · light now`, `Auto · dark now`, `Light`, `Dark` (before mount: `Auto`). The label text updates when the resolved theme changes in Auto.
- Visibility: shown on `:hover` and `:focus-visible` of the button (CSS), and for about 2000 ms after every activation by click, Enter or Space (state with one timer, cleared on unmount and restarted on each activation). It is not shown on page load.
- Placement: below the header controls, right-aligned to the toggle, inside the viewport at 390 px (no horizontal overflow), above page content (`z-index` above the sticky header's siblings but below the season menu), styled in the site's own language (amended 2026-11-11 after owner feedback that a plain bordered box looked unappealing): a flat pill (`border-radius` fully rounded, matching the round header controls), no border, no shadow, no gradient (`docs/redesign-notes.md` forbids them), type only: Geist at the 16px `--type-small` step, weight 600, tight negative letter-spacing like the buttons and headings. Colours come only from tokens so every season and both themes work: either the primary-button treatment (`--accent` fill, `--on-accent` text) or the control treatment (`--surface` fill with `--ink` text and a `--muted` secondary part), whichever looks better in the screenshots; text MUST keep AA contrast (4.5:1) against its fill in all 12 season x theme combinations. No transition or animation, so reduced motion needs no special case; it must not change the header's height or the controls' positions.
- It must not obscure the open season menu (the menu stays on top) and must not intercept pointer or keyboard input.

## Icon animation (FR-013, added 2026-11-11)
- Only the icon animates, only when the mode changes after mount through activation (click, Enter, Space) or a storage-event mode change; never on first render, hydration, or remount after client-side navigation (track the previously rendered mode in a ref initialised at mount, not in a module variable).
- Mechanism: the `svg` is keyed by mode so the incoming icon plays a CSS keyframe (e.g. `theme-icon-in`: from `opacity: 0; transform: rotate(-60deg) scale(0.6)` to `opacity: 1; transform: none`), duration 200 to 240 ms, `var(--ease-out)`, `animation-fill-mode: both` is NOT used so the end state is the plain icon. The animation is applied through a `data-animate="true"` attribute (or equivalent class) on the button that is set for the duration of the animation and removed on `animationend` or after a timeout fallback, so a missing `animationend` can never leave the icon invisible.
- Gated by `@media (prefers-reduced-motion: no-preference)`; with reduced motion the icon swaps instantly. Transform and opacity only. The existing `:active` press scale (0.94) stays. The mode label stays animation-free.
- Without JavaScript or before hydration nothing animates and the icon is fully visible.
