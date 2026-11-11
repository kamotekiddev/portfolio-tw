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
- Icons (`react-icons/fi`, `aria-hidden`): Auto `FiClock`, Light `FiSun`, Dark `FiMoon`.
- In Auto: `setTimeout(msUntilNextThemeChange(now) + 250)` re-resolves and re-arms; also re-resolves on `document.visibilitychange` (visible) and `window` `focus`. In Light/Dark no timers.
- Re-reads the mode on `window` `storage` events for `theme-mode`/`theme` so other tabs follow.
- Reading the mode: `resolveStoredMode(localStorage["theme-mode"], localStorage["theme"])` (errors → `auto`). Whenever the toggle applies a theme it also writes `theme-mode` first, so a clock-written `theme` can never be mistaken for a legacy explicit choice (amended after review: storage cleared while a tab is open must leave Auto users on Auto).
