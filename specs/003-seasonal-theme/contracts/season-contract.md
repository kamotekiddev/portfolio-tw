# Contract: season module, DOM, and storage

This is the shared interface between the season logic (Anvil), the UI (Pixel), and the browser
tests (Echo). Change it only through Atlas.

## Module `app/data/seasons.ts` (import as `@/data/seasons`)

Pure and isomorphic: no React, Next, `server-only`, or `"use client"`; no top-level access to
`window`, `document`, or `localStorage`.

```ts
export const SEASONS = ["spring", "summer", "autumn", "winter", "wet", "dry"] as const;
export type Season = (typeof SEASONS)[number];
export type SeasonPreference = "auto" | Season;
export type RegionBand =
   | "north-temperate" | "south-temperate"
   | "north-tropical" | "south-tropical"
   | "unknown";

export const SEASON_LABELS: Record<Season, string>;
// Spring, Summer, Autumn, Winter, Wet season, Dry season

export const SEASON_STORAGE_KEY = "season";
export const SEASON_ATTRIBUTE = "data-season";

export function regionBandForTimeZone(timeZone: string | null | undefined): RegionBand;
export function seasonForBand(band: RegionBand, monthIndex: number): Season | null; // monthIndex 0–11
export function detectSeason(timeZone: string | null | undefined, date: Date): Season | null; // uses date.getMonth()
export function parseSeasonPreference(value: unknown): SeasonPreference; // anything invalid → "auto"
export function resolveSeason(
   preference: SeasonPreference,
   timeZone: string | null | undefined,
   date: Date
): Season | null;

/** Self-contained IIFE source for an inline <script>. Never throws. At most 4 KB. */
export const seasonInitScript: string;
```

`seasonInitScript` behaviour, which must agree with `resolveSeason` for every input:

1. Read `localStorage[SEASON_STORAGE_KEY]` inside `try`; failure or invalid value means `auto`.
2. Read `Intl.DateTimeFormat().resolvedOptions().timeZone` inside `try`; failure means unknown.
3. Compute the season with the current `new Date()`.
4. Set `document.documentElement` `data-season` to the season, or remove the attribute when null.

## DOM

- `<html data-season="spring|summer|autumn|winter|wet|dry">`; the attribute is **absent** when no
  season applies. CSS must render today's emerald design when it is absent.
- Dark/light stays on the `dark` class managed by `next-themes`; season CSS uses
  `[data-season="…"]` for light and `.dark[data-season="…"]` for dark.
- Ambient layer: one element with class `season-ambient`, `aria-hidden="true"`, rendered once in
  the root layout, containing only empty `<span>` children.
- Picker: a `<button>` with class `season-toggle` and an accessible name that begins with
  `Season` and includes the current choice (for example `Season: Automatic`), `aria-haspopup="menu"`
  and `aria-expanded`. It opens an element with `role="menu"` and accessible name `Season`
  containing seven `role="menuitemradio"` items named `Automatic`, `Spring`, `Summer`, `Autumn`,
  `Winter`, `Wet season`, `Dry season`, with `aria-checked` on the current preference. Escape and
  outside click close it and Escape returns focus to the button; arrow keys move between items.

## Storage

- `localStorage["season"]`: `auto` or a season id. The picker writes it inside `try`; a write
  failure must not prevent the attribute from updating.
- Choosing `Automatic` stores `auto` and applies `detectSeason(zone, new Date())`.
