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

## Picker button icon and Auto badge (FR-017, added 2026-11-11)
- After mount the button holds exactly ONE `aria-hidden` svg: the icon of the season currently applied to `<html data-season>` (spring feather, summer sunrise, autumn wind, winter cloud-snow, wet cloud-rain, dry thermometer, the same icons the menu items use), or the neutral compass when no season applies.
- Only when the stored preference is Automatic (including before mount), a badge `span.season-toggle-badge` (`aria-hidden="true"`, text "A") sits on the icon's bottom-right corner exactly like the theme toggle's `theme-toggle-badge` (flat 16 px circle, `--accent` fill, `--on-accent` text, Geist 600 about 10 px, no border or shadow, `pointer-events: none`, fully inside the 44 px button). Manual choices render no badge element. The badge inverts its colours (`--on-accent` fill, `--accent` letter) whenever the button itself is accent-filled: on hover-capable pointer hover and while the menu is open (`aria-expanded="true"`).
- Before hydration (preference unknown): render all six season icons plus the compass and the badge, and let CSS show the one matching `html[data-season]` (the compass when the attribute is absent), so the right icon is visible from first paint, and no-JS shows the compass. After mount exactly one svg follows the applied season.
- Accessible name, menu structure and the menu items' icons are unchanged. No animation is added.

## Season toggle (FR-018, added 2026-11-11; supersedes the picker menu and the `Season:` menu ARIA above)

### Module additions (`app/data/seasons.ts`, pure, no browser access)
```ts
export function seasonsForBand(band: RegionBand): readonly Season[];
// north-temperate and south-temperate: ["spring","summer","autumn","winter"]; north-tropical and south-tropical: ["wet","dry"]; unknown: []
export function availableSeasons(timeZone: string | null | undefined): readonly Season[]; // seasonsForBand(regionBandForTimeZone(tz))
export function nextSeasonPreference(preference: SeasonPreference, timeZone: string | null | undefined, date: Date): SeasonPreference;
```
- `resolveSeason(preference, tz, date)` changes: a manual preference that is NOT in `availableSeasons(tz)` is treated as `"auto"` (so a stored `winter` in a tropical region resolves to the detected wet/dry season, and in an unknown region resolves to `null`).
- `nextSeasonPreference`: `detected = detectSeason(tz, date)`, `list = availableSeasons(tz)`. If `detected` is null or `list` is empty return `"auto"`. `current` = `detected` when `preference` is `"auto"` or not in `list`, otherwise `preference`. `next = list[(list.indexOf(current) + 1) % list.length]`. Return `"auto"` when `next === detected`, else `next`. (Temperate: auto in autumn → winter → spring → summer → auto. Tropical: auto in wet → dry → auto.)
- `seasonInitScript` must implement the same availability rule from the same embedded tables (a stored season outside the region's list is ignored) and stay at most 4096 characters; parity with `resolveSeason` for every input, as before. It must still set or remove `data-season` before first paint.

### DOM and behaviour
- A single button `.season-toggle` in a `div.season-toggle-wrap` (position: relative), disabled until mounted. No `aria-haspopup`, no `aria-expanded`, no menu, no `role="menu"`. Click/Enter/Space call `nextSeasonPreference`, write `localStorage["season"]` (try/catch, idempotent, only when changed), then set or remove `data-season`. A write failure must not block applying; keep a module-level `sessionPreference` fallback like the theme toggle's `sessionMode` so a choice survives client-side navigation when storage is blocked.
- Accessible name: `Season: Auto (currently <label>)` in Auto (`<label>` = Spring, Summer, Autumn, Winter, wet season, dry season, lower-cased e.g. `Season: Auto (currently wet season)`), `Season: <Label>` for a manual choice (`Season: Winter`, `Season: Wet season`); before mount `Season: Auto`.
- Not shown when no season applies: `html:not([data-season]) .season-toggle-wrap { display: none }` (covers no-JS, unknown regions, and pre-hydration with the init script having removed or not set the attribute).
- Icon, badge, pre-hydration icons: as in "Picker button icon and Auto badge (FR-017)" above (badge inverts on `(hover: hover)` hover only now; there is no open-menu state).
- Label: `span.season-toggle-label` (aria-hidden, pointer-events none), text `Auto · <season> now` (lower-case season, e.g. `Auto · autumn now`, `Auto · wet season now`) or `<Season label>` for manual; the same pill styling, hover/focus/2 s-after-activation behaviour and `@media (hover: hover)` scoping as `.theme-toggle-label`. Only one header label is visible at a time: showing one hides the other (use a shared DOM CustomEvent or equivalent; no layout change). Placement under its own button, right-aligned to it, fully inside the viewport at 390 px.
- Icon animation: same `theme-icon-in` keyframe and `data-animate` mechanism as the theme toggle, on mode changes after mount only (never on load, hydration, navigation remount, or storage-derived initial state), reduced motion respected.
- Cross-tab: follow `storage` events for key `season` (and `null`/clear) by re-reading the preference and re-applying, with the same idempotent-write guard to avoid ping-pong.
- Removed: `.season-menu`, `.season-option`, `.season-hint`, `.season-check` styles and markup, the open-menu rules (`.header-controls:has(.season-toggle[aria-expanded="true"])`), and the theme label's special-casing of the season menu.

## Season menu with free choice (FR-019, added 2026-11-11; supersedes the "Season toggle (FR-018)" section above)

### Module (`app/data/seasons.ts`, pure)
- REMOVE `seasonsForBand`, `availableSeasons`, `nextSeasonPreference` and the availability rule: `resolveSeason(preference, tz, date)` honours any valid manual season in every region again (`"auto"` still resolves to `detectSeason`). `seasonInitScript` drops the availability check the same way (a stored valid season always applies; an unknown region with `auto` removes the attribute), still at most 4096 characters with parity against `resolveSeason`.
- ADD `preferenceForSelection(season: Season, timeZone: string | null | undefined, date: Date): SeasonPreference` returning `"auto"` when `season === detectSeason(timeZone, date)`, otherwise `season`.

### DOM and behaviour
- Button `.season-toggle` (in `div.season-toggle-wrap`): `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` only while open, disabled until mounted; accessible name `Season: Auto (currently autumn)` in Auto, `Season: Winter` for a manual choice, `Season: Auto` before mount. Icon = the applied season's icon (compass when none) and the "A" badge only in Auto (FR-017, unchanged, including the pre-hydration icons and hover inversion; the badge also inverts while the menu is open because the button is accent-filled then).
- Menu: `ul.season-menu[role="menu"][aria-label="Season"]` with `li[role="none"] > button.season-option[role="menuitemradio"]`, one per season in the order spring, summer, autumn, winter, wet, dry; `aria-checked="true"` on the effective selection (the detected season's row when the preference is `auto`, otherwise the chosen season's row). Each row shows the season's icon, its name and, on the detected season's row only, a visible "Automatic" tag. The accessible name of the detected season's row is `<Label> (Automatic)`; other rows are just `<Label>` (`Wet season`, `Dry season`). When no season is detected (unrecognised region) there is one extra FIRST item, name `Automatic`, `aria-checked` when the preference is `auto`, applying the default emerald design.
- Keyboard (as in the original picker): Enter/Space/ArrowDown/ArrowUp on the button open the menu and focus the checked item; ArrowUp/ArrowDown wrap, Home/End jump; Enter/Space select, close and return focus to the button; Escape closes and returns focus; Tab closes and lets focus move on; an outside pointer-down closes. Visible focus on rows.
- Choosing a row: `preferenceForSelection` (or `auto` for the extra item), idempotent `localStorage["season"]` write (try/catch, session fallback for blocked storage that survives client-side navigation), set or remove `data-season` only on change, close the menu, show the label ~2 s, animate the icon (spec 004 FR-013 mechanism, only when the selection changed).
- The label pill (`span.season-toggle-label`) keeps its behaviour but is hidden while the menu is open; the theme toggle's label is hidden while the season menu is open. Only one label at a time.
- The control is shown in every region (remove the `html:not([data-season])` hide rule). No-JS: the button is disabled and shows the compass with the badge, as in the original picker.
- Cross-tab `storage` follow for the `season` key (idempotent, no ping-pong) stays.

### Menu design (design-system styling)
Flat panel in tokens only (no border, shadow or gradient; see docs/redesign-notes.md): `--surface` fill; Geist type-only rows (about 16 to 18 px, weight 500, tight negative letter-spacing like buttons and headings); the selected row is a fully rounded pill filled with `--accent` and `--on-accent` text (the primary-button treatment); hover and focus-visible rows get a subtle token-based tint with the existing 3px accent focus outline; the "Automatic" tag is small type in the secondary tone (`--muted`) on unselected rows and the on-accent tone on the selected row, never relying on opacity alone for AA. Round the panel to match the round controls and the label pill. Right-aligned under the button, inside the viewport at 390 px (width cap as in the original picker), above page content, no transition or animation. AA (4.5:1) for every text part against its own fill in all 12 season x theme combinations.
