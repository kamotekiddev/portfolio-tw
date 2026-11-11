// Time-of-day theme rule and theme mode storage. Pure and isomorphic: safe to import from server
// and client code. `themeInitScript` is generated from the same constants below.

export const THEME_MODES = ["auto", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = "light" | "dark";

export const THEME_MODE_STORAGE_KEY = "theme-mode";
/** next-themes' own storage key (unchanged). */
export const NEXT_THEMES_STORAGE_KEY = "theme";

/** Light from 06:00 local time. */
export const DAY_START_HOUR = 6;
/** Dark from 18:00 local time. */
export const DAY_END_HOUR = 18;

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
   auto: "Auto",
   light: "Light",
   dark: "Dark",
};

const AUTO_MODE: ThemeMode = "auto";
const DAY_THEME: ResolvedTheme = "light";
const NIGHT_THEME: ResolvedTheme = "dark";
/** Stored values that count as an explicit choice, including a legacy next-themes `theme`. */
const EXPLICIT_THEMES: readonly ResolvedTheme[] = [DAY_THEME, NIGHT_THEME];

/** Fallback delay when the current time is unusable. */
const RETRY_DELAY_MS = 60_000;

/** Light for whole hours 6..17, dark otherwise (including invalid or non-integer hours). */
export function themeForHour(hour: number): ResolvedTheme {
   return Number.isInteger(hour) &&
      hour >= DAY_START_HOUR &&
      hour < DAY_END_HOUR
      ? DAY_THEME
      : NIGHT_THEME;
}

/** Light and Dark ignore the clock; Auto (or anything else) uses the local hour of `date`. */
export function resolveTheme(mode: ThemeMode, date: Date): ResolvedTheme {
   return EXPLICIT_THEMES.indexOf(mode as ResolvedTheme) >= 0
      ? (mode as ResolvedTheme)
      : themeForHour(date.getHours());
}

export function parseThemeMode(value: unknown): ThemeMode | null {
   return typeof value === "string" &&
      (THEME_MODES as readonly string[]).indexOf(value) >= 0
      ? (value as ThemeMode)
      : null;
}

/**
 * The mode to use from what is stored: a valid `theme-mode` wins; otherwise a legacy
 * next-themes `theme` of exactly "light" or "dark" is an explicit choice; otherwise Auto.
 * The single source of truth for the legacy rule (`themeInitScript` mirrors it).
 */
export function resolveStoredMode(
   storedMode: unknown,
   legacyTheme: unknown
): ThemeMode {
   const mode = parseThemeMode(storedMode);
   if (mode !== null) return mode;
   return EXPLICIT_THEMES.indexOf(legacyTheme as ResolvedTheme) >= 0
      ? (legacyTheme as ResolvedTheme)
      : AUTO_MODE;
}

/**
 * The mode after one press of the theme toggle at `date`: it selects the opposite of the theme
 * currently shown, and that selection means Auto when it is the theme the time of day calls for.
 * By day: auto -> dark -> auto (a stored light -> dark). At night: auto -> light -> auto (a stored
 * dark -> light). An invalid date counts as night (`themeForHour(NaN)` is dark).
 */
export function nextThemeMode(mode: ThemeMode, date: Date): ThemeMode {
   const shown = resolveTheme(mode, date);
   const target = shown === DAY_THEME ? NIGHT_THEME : DAY_THEME;
   return target === themeForHour(date.getHours()) ? AUTO_MODE : target;
}

/** Orders local (date, hour) pairs; months and days are spaced so keys never collide. */
const localHourKey = (date: Date, hour = date.getHours()) =>
   ((date.getFullYear() * 12 + date.getMonth()) * 32 + date.getDate()) * 24 +
   hour;

/**
 * Milliseconds until the next local 06:00 or 18:00 strictly after `date` (the next instant the
 * Auto theme flips); always > 0. The target is rebuilt from local calendar fields with
 * `new Date(y, m, d, hour)`, so DST changes shorten or lengthen the wait instead of skewing it.
 * If that wall time does not exist exactly (a DST gap such as Antarctica/Casey on 2018-10-07,
 * 04:00 → 07:00), the result is the first instant whose local hour is at or past the boundary
 * (07:00 there, not the 09:00 that `new Date` normalizes 06:00 to). A repeated hour resolves to
 * its first occurrence. An invalid date returns 60_000.
 */
export function msUntilNextThemeChange(date: Date): number {
   // Tag check (not instanceof) so Dates from another realm or a patched global still count.
   const now =
      Object.prototype.toString.call(date) === "[object Date]"
         ? date.getTime()
         : Number.NaN;
   if (!Number.isFinite(now)) return RETRY_DELAY_MS;
   const hour = date.getHours();
   const boundary =
      hour >= DAY_START_HOUR && hour < DAY_END_HOUR
         ? DAY_END_HOUR
         : DAY_START_HOUR;
   const dayOffset = hour >= DAY_END_HOUR ? 1 : 0;
   const year = date.getFullYear();
   const month = date.getMonth();
   const day = date.getDate() + dayOffset;

   const target = new Date(year, month, day, boundary);
   let end = target.getTime();
   if (
      end > now &&
      target.getHours() === boundary &&
      target.getMinutes() === 0 &&
      target.getSeconds() === 0
   )
      return end - now;

   // DST edge: find the first instant after `now` whose local date and hour reach the boundary.
   // `now` is before it by construction; noon avoids DST changes at midnight.
   const goal = localHourKey(new Date(year, month, day, 12), boundary);
   const reached = (time: number) => localHourKey(new Date(time)) >= goal;
   for (let i = 0; i < 48 && !(end > now && reached(end)); i++)
      end += 30 * 60_000;
   if (!(end > now && reached(end))) return RETRY_DELAY_MS;
   let start = now;
   while (end - start > 1) {
      const middle = Math.floor((start + end) / 2);
      if (reached(middle)) end = middle;
      else start = middle;
   }
   return end - now;
}

// JSON for embedding in an inline <script>: "<" is escaped so "</script" and "<!--" cannot occur.
const embed = (value: unknown) =>
   JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Self-contained ES5 IIFE for an inline <script> placed before next-themes' script. It mirrors
 * `resolveStoredMode(theme-mode, theme)` (storing the result when `theme-mode` was missing or
 * invalid), resolves it like `resolveTheme(mode, new Date())`, and writes the resolved theme to
 * next-themes' `theme` key so its pre-paint script applies it. Independently of storage it also
 * puts the resolved class and `color-scheme` on <html>, so blocked storage still paints the
 * right theme. Never throws.
 */
export const themeInitScript = [
   "(function(){try{",
   `var K=${embed(THEME_MODE_STORAGE_KEY)},T=${embed(NEXT_THEMES_STORAGE_KEY)},`,
   `N=${embed(THEME_MODES)},X=${embed(EXPLICIT_THEMES)},A=${embed(AUTO_MODE)},`,
   `S=${embed(DAY_START_HOUR)},E=${embed(DAY_END_HOUR)},m,l,h,d;`,
   "try{m=localStorage.getItem(K)}catch(e){}",
   "if(N.indexOf(m)<0){try{l=localStorage.getItem(T)}catch(e){}",
   "m=X.indexOf(l)>=0?l:A;",
   "try{localStorage.setItem(K,m)}catch(e){}}",
   "if(X.indexOf(m)<0){h=new Date().getHours();",
   "m=typeof h==='number'&&h%1===0&&h>=S&&h<E?X[0]:X[1]}",
   "try{localStorage.setItem(T,m)}catch(e){}",
   "try{d=document.documentElement;",
   "d.classList.remove(m===X[0]?X[1]:X[0]);d.classList.add(m)}catch(e){}",
   "try{d.style.colorScheme=m}catch(e){}",
   "}catch(e){}})();",
].join("");
