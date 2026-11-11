import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import {
   DAY_END_HOUR,
   DAY_START_HOUR,
   NEXT_THEMES_STORAGE_KEY,
   THEME_MODES,
   THEME_MODE_LABELS,
   THEME_MODE_STORAGE_KEY,
   msUntilNextThemeChange,
   nextThemeMode,
   parseThemeMode,
   resolveStoredMode,
   resolveTheme,
   themeForHour,
   themeInitScript,
   type ResolvedTheme,
   type ThemeMode,
} from "../app/data/theme-schedule";

const HOUR = 3_600_000;
const MINUTE = 60_000;

// Written out by hand from the spec (FR-002): light 06:00–17:59, dark otherwise. Index = hour.
// prettier-ignore
const EXPECTED_BY_HOUR: ResolvedTheme[] = [
   "dark", "dark", "dark", "dark", "dark", "dark",
   "light", "light", "light", "light", "light", "light",
   "light", "light", "light", "light", "light", "light",
   "dark", "dark", "dark", "dark", "dark", "dark",
];

// Dates are built from local components so expectations hold in any runner time zone.
const at = (hour: number, minute = 0, second = 0, ms = 0) =>
   new Date(2026, 10, 11, hour, minute, second, ms);

test("exposes the modes, labels, keys, and day boundaries", () => {
   assert.deepEqual([...THEME_MODES], ["auto", "light", "dark"]);
   assert.deepEqual(THEME_MODE_LABELS, {
      auto: "Auto",
      light: "Light",
      dark: "Dark",
   });
   assert.equal(THEME_MODE_STORAGE_KEY, "theme-mode");
   assert.equal(NEXT_THEMES_STORAGE_KEY, "theme");
   assert.equal(DAY_START_HOUR, 6);
   assert.equal(DAY_END_HOUR, 18);
});

test("maps all 24 hours to the day/night rule", () => {
   assert.equal(EXPECTED_BY_HOUR.length, 24);
   let checked = 0;
   EXPECTED_BY_HOUR.forEach((theme, hour) => {
      assert.equal(themeForHour(hour), theme, `hour ${hour}`);
      assert.equal(resolveTheme("auto", at(hour, 30)), theme, `auto ${hour}`);
      checked++;
   });
   assert.equal(checked, 24);
});

test("switches exactly at 06:00 and 18:00 local time", () => {
   const cases: [Date, ResolvedTheme][] = [
      [at(0, 0, 0, 0), "dark"],
      [at(5, 59, 59, 999), "dark"],
      [at(6, 0, 0, 0), "light"],
      [at(17, 59, 59, 999), "light"],
      [at(18, 0, 0, 0), "dark"],
      [at(23, 59, 59, 999), "dark"],
   ];
   for (const [date, theme] of cases)
      assert.equal(resolveTheme("auto", date), theme, date.toString());
});

test("treats invalid hours as night", () => {
   for (const hour of [
      -1,
      24,
      25,
      5.5,
      6.5,
      12.000001,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      "7",
      null,
      undefined,
      {},
   ]) {
      assert.equal(themeForHour(hour as number), "dark", String(hour));
   }
   assert.equal(resolveTheme("auto", new Date(Number.NaN)), "dark");
});

test("explicit light and dark ignore the clock", () => {
   for (let hour = 0; hour < 24; hour++) {
      assert.equal(resolveTheme("light", at(hour)), "light", `light ${hour}`);
      assert.equal(resolveTheme("dark", at(hour)), "dark", `dark ${hour}`);
   }
   assert.equal(resolveTheme("light", new Date(Number.NaN)), "light");
   assert.equal(resolveTheme("dark", new Date(Number.NaN)), "dark");
});

test("parses only exact stored modes", () => {
   assert.equal(parseThemeMode("auto"), "auto");
   assert.equal(parseThemeMode("light"), "light");
   assert.equal(parseThemeMode("dark"), "dark");
   for (const value of [
      "Auto",
      "LIGHT",
      "Dark",
      " dark",
      "light ",
      "system",
      "",
      null,
      undefined,
      0,
      1,
      true,
      {},
      ["dark"],
   ]) {
      assert.equal(
         parseThemeMode(value),
         null,
         JSON.stringify(value) ?? String(value)
      );
   }
});

test("resolves the stored mode with the legacy theme rule", () => {
   const cases: [unknown, unknown, ThemeMode][] = [
      // Nothing usable stored: Auto.
      [null, null, "auto"],
      [undefined, undefined, "auto"],
      ["", "", "auto"],
      [null, "system", "auto"],
      [null, "auto", "auto"],
      [null, "Light", "auto"],
      [null, "DARK", "auto"],
      [null, " light", "auto"],
      [null, 1, "auto"],
      [null, {}, "auto"],
      [null, ["dark"], "auto"],
      // Legacy explicit choice with no (or an invalid) mode.
      [null, "light", "light"],
      [undefined, "dark", "dark"],
      ["", "light", "light"],
      ["system", "dark", "dark"],
      ["Auto", "light", "light"],
      ["LIGHT", "dark", "dark"],
      [" dark", "light", "light"],
      [7, "dark", "dark"],
      [{}, "light", "light"],
      // A valid mode wins over a conflicting legacy theme.
      ["auto", "dark", "auto"],
      ["auto", "light", "auto"],
      ["light", "dark", "light"],
      ["dark", "light", "dark"],
      ["dark", null, "dark"],
      ["auto", null, "auto"],
      ["light", "system", "light"],
   ];
   for (const [stored, legacy, mode] of cases) {
      assert.equal(
         resolveStoredMode(stored, legacy),
         mode,
         `${JSON.stringify(stored) ?? String(stored)} / ${JSON.stringify(legacy) ?? String(legacy)}`
      );
   }
});

const DAY_TIMES = [
   at(6, 0, 0, 0),
   at(12, 0, 0, 0),
   at(17, 59, 59, 0),
   at(17, 59, 59, 999),
];
const NIGHT_TIMES = [
   at(18, 0, 0, 0),
   at(22, 0, 0, 0),
   at(5, 59, 59, 0),
   at(5, 59, 59, 999),
   at(0, 0, 0, 0),
];

test("the toggle flips the shown theme; the scheduled theme means auto", () => {
   for (const date of DAY_TIMES) {
      const label = date.toString();
      assert.equal(nextThemeMode("auto", date), "dark", `auto ${label}`);
      assert.equal(nextThemeMode("dark", date), "auto", `dark ${label}`);
      assert.equal(nextThemeMode("light", date), "dark", `light ${label}`);
   }
   for (const date of NIGHT_TIMES) {
      const label = date.toString();
      assert.equal(nextThemeMode("auto", date), "light", `auto ${label}`);
      assert.equal(nextThemeMode("light", date), "auto", `light ${label}`);
      assert.equal(nextThemeMode("dark", date), "light", `dark ${label}`);
   }
});

test("the toggle switches its auto rule exactly at 06:00 and 18:00", () => {
   assert.equal(nextThemeMode("auto", at(5, 59, 59, 999)), "light");
   assert.equal(nextThemeMode("auto", at(6, 0, 0, 0)), "dark");
   assert.equal(nextThemeMode("auto", at(17, 59, 59, 999)), "dark");
   assert.equal(nextThemeMode("auto", at(18, 0, 0, 0)), "light");
   assert.equal(nextThemeMode("light", at(5, 59, 59, 999)), "auto");
   assert.equal(nextThemeMode("light", at(6, 0, 0, 0)), "dark");
   assert.equal(nextThemeMode("dark", at(17, 59, 59, 999)), "auto");
   assert.equal(nextThemeMode("dark", at(18, 0, 0, 0)), "light");
});

test("two presses return to the start from auto or the off-schedule theme", () => {
   const twice = (mode: ThemeMode, date: Date) =>
      nextThemeMode(nextThemeMode(mode, date), date);
   for (const date of DAY_TIMES) {
      assert.equal(twice("auto", date), "auto");
      assert.equal(twice("dark", date), "dark");
      // A stored light by day (same as the schedule) settles into the auto/dark pair.
      assert.equal(nextThemeMode("light", date), "dark");
      assert.equal(twice("light", date), "auto");
   }
   for (const date of NIGHT_TIMES) {
      assert.equal(twice("auto", date), "auto");
      assert.equal(twice("light", date), "light");
      assert.equal(twice("dark", date), "auto");
   }
   // Every press changes the shown theme, at every hour.
   for (let hour = 0; hour < 24; hour++) {
      const date = at(hour, 30);
      for (const mode of THEME_MODES) {
         assert.notEqual(
            resolveTheme(nextThemeMode(mode, date), date),
            resolveTheme(mode, date),
            `${mode} at ${hour}:30`
         );
      }
   }
});

test("the toggle treats an invalid date as night and never throws", () => {
   const invalid = new Date(Number.NaN);
   assert.equal(nextThemeMode("auto", invalid), "light");
   assert.equal(nextThemeMode("light", invalid), "auto");
   assert.equal(nextThemeMode("dark", invalid), "light");
});

test("counts down to the next 06:00 or 18:00 boundary", () => {
   const cases: [Date, number][] = [
      [at(0, 0, 0, 0), 21_600_000],
      [at(5, 59, 59, 999), 1],
      [at(6, 0, 0, 0), 43_200_000],
      [at(12, 0, 0, 0), 21_600_000],
      [at(17, 59, 59, 999), 1],
      [at(18, 0, 0, 0), 43_200_000],
      [at(23, 59, 59, 999), 21_600_001],
   ];
   for (const [date, ms] of cases)
      assert.equal(msUntilNextThemeChange(date), ms, date.toString());
});

test("counts down correctly for every minute of a regular day", () => {
   for (let minute = 0; minute < 24 * 60; minute++) {
      const date = at(0, minute);
      let expected: number;
      if (minute < 6 * 60) expected = (6 * 60 - minute) * MINUTE;
      else if (minute < 18 * 60) expected = (18 * 60 - minute) * MINUTE;
      else expected = (30 * 60 - minute) * MINUTE;
      const ms = msUntilNextThemeChange(date);
      assert.ok(ms > 0, `positive at minute ${minute}`);
      assert.equal(ms, expected, `minute ${minute}`);
   }
});

test("rolls over month and year ends", () => {
   assert.equal(
      msUntilNextThemeChange(new Date(2026, 11, 31, 23, 0)),
      7 * HOUR
   );
   const landing = new Date(
      new Date(2026, 11, 31, 23, 0).getTime() +
         msUntilNextThemeChange(new Date(2026, 11, 31, 23, 0))
   );
   assert.deepEqual(
      [landing.getFullYear(), landing.getMonth(), landing.getDate()],
      [2027, 0, 1]
   );
   assert.equal(msUntilNextThemeChange(new Date(2026, 1, 28, 20)), 10 * HOUR);
});

/**
 * DST dates in common zones (US, EU, Chile, AU/NZ) plus 2018-10-07, when Antarctica/Casey jumped
 * 04:00 → 07:00, so 06:00 did not exist (`new Date` normalizes 06:00 to 09:00 there; the real
 * flip is at 07:00). In the runner's zone these may be ordinary days; the invariants below hold in
 * any zone. Run with e.g. `TZ=America/New_York` or `TZ=Antarctica/Casey` to exercise transitions.
 *
 * At the landing instant the local time is 06:00:00.000 or 18:00:00.000, unless that wall time
 * does not exist (DST gap): then the landing is the first valid instant after the gap, so the
 * local (date, hour) just before landing is below the boundary and at landing is at or past it.
 * The 13h cap holds for these dates in common zones; historic multi-hour fall-backs (e.g.
 * Antarctica/Casey, 3h) make a real night longer and are not in this list.
 */
const hourKey = (date: Date, hour = date.getHours()) =>
   ((date.getFullYear() * 12 + date.getMonth()) * 32 + date.getDate()) * 24 +
   hour;
const DST_DATES: [number, number, number][] = [
   [2026, 2, 8],
   [2026, 2, 29],
   [2026, 3, 5],
   [2026, 8, 6],
   [2026, 9, 4],
   [2026, 9, 25],
   [2026, 10, 1],
   [2026, 10, 11],
   [2018, 9, 7],
];

test("lands on the theme flip across DST transition dates in any zone", (t) => {
   let checked = 0;
   let gaps = 0;
   for (const [year, month, day] of DST_DATES) {
      for (let minute = 0; minute < 24 * 60; minute++) {
         const date = new Date(year, month, day, 0, minute);
         const label = `${date.toString()} (minute ${minute})`;
         const ms = msUntilNextThemeChange(date);
         assert.ok(Number.isFinite(ms) && ms > 0, `positive: ${label}`);
         assert.ok(ms <= 13 * HOUR, `at most 13h: ${label} -> ${ms}`);

         const landing = new Date(date.getTime() + ms);
         const before = new Date(date.getTime() + ms - 1);
         // No flip before the landing instant, and a flip exactly at it.
         assert.equal(
            resolveTheme("auto", before),
            resolveTheme("auto", date),
            `no early flip: ${label}`
         );
         assert.notEqual(
            resolveTheme("auto", landing),
            resolveTheme("auto", before),
            `flips at landing: ${label}`
         );

         const onBoundary =
            (landing.getHours() === 6 || landing.getHours() === 18) &&
            landing.getMinutes() === 0 &&
            landing.getSeconds() === 0 &&
            landing.getMilliseconds() === 0;
         const acrossGap = [6, 18].some(
            (hour) =>
               hourKey(before) < hourKey(landing, hour) &&
               hourKey(landing, hour) <= hourKey(landing)
         );
         assert.ok(
            onBoundary || acrossGap,
            `lands on 06:00/18:00 or just past a DST gap: ${label} -> ${landing.toString()}`
         );
         if (!onBoundary) gaps++;
         checked++;
      }
   }
   assert.equal(checked, DST_DATES.length * 24 * 60);
   // Informational: > 0 only when the runner's zone has a DST gap at 06:00 or 18:00.
   t.diagnostic(`gap landings: ${gaps}`);
});

// A child process pins the zone, so this runs the same in any runner time zone and leaves this
// process's TZ untouched. Antarctica/Casey jumped 04:00 (+08) → 07:00 (+11) on 2018-10-07, so
// the 06:00 boundary does not exist: the Auto theme flips at the jump (07:00 local).
test("lands on the first valid instant when 06:00 falls in a DST gap", (t) => {
   const root = path.join(__dirname, "..");
   const moduleUrl = pathToFileURL(
      path.join(root, "app/data/theme-schedule.ts")
   ).href;
   const probe = [
      "const m = await import(process.argv[1]);",
      "const gap = new Date(2018, 9, 7, 6).getHours() !== 6;",
      "const rows = [[2018,9,7,0,0],[2018,9,7,3,59],[2018,9,7,8,0],[2018,9,6,18,0]].map((f) => {",
      "  const d = new Date(f[0], f[1], f[2], f[3], f[4]);",
      "  const ms = m.msUntilNextThemeChange(d);",
      "  const l = new Date(d.getTime() + ms);",
      "  return [ms, l.getHours(), l.getMinutes(), l.toISOString()];",
      "});",
      "console.log(JSON.stringify({ gap, rows }));",
   ].join("\n");
   const child = spawnSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", probe, moduleUrl],
      {
         cwd: root,
         encoding: "utf8",
         env: { ...process.env, TZ: "Antarctica/Casey" },
      }
   );
   assert.equal(child.status, 0, child.stderr);
   const { gap, rows } = JSON.parse(child.stdout.trim());
   if (!gap) {
      t.skip("this Node's time zone data has no 2018 Casey gap");
      return;
   }
   assert.deepEqual(rows, [
      // 00:00 +08 → 07:00 +11 (20:00Z): 4h, not the 6h to the normalized 09:00.
      [14_400_000, 7, 0, "2018-10-06T20:00:00.000Z"],
      [60_000, 7, 0, "2018-10-06T20:00:00.000Z"],
      // After the jump: ordinary countdown to 18:00 +11.
      [36_000_000, 18, 0, "2018-10-07T07:00:00.000Z"],
      // The evening before: 18:00 +08 → 07:00 +11 next morning.
      [36_000_000, 7, 0, "2018-10-06T20:00:00.000Z"],
   ]);
});

test("waits one minute for an invalid date", () => {
   assert.equal(msUntilNextThemeChange(new Date(Number.NaN)), 60_000);
   assert.equal(msUntilNextThemeChange(new Date("not a date")), 60_000);
   assert.equal(msUntilNextThemeChange(null as unknown as Date), 60_000);
   assert.equal(
      msUntilNextThemeChange({ getTime: () => 0 } as unknown as Date),
      60_000
   );
});

test("accepts a Date from another realm", () => {
   const foreign = vm.runInNewContext(
      "new Date(2026, 10, 11, 5, 0, 0, 0)"
   ) as Date;
   assert.equal(msUntilNextThemeChange(foreign), 3_600_000);
});

// ---- Init script parity ---------------------------------------------------------------------

type Run = {
   /** Stored `theme-mode`; undefined means the key is missing (getItem returns null). */
   mode?: unknown;
   /** Stored next-themes `theme`; undefined means missing. */
   theme?: unknown;
   hour?: unknown;
   getThrows?: "mode" | "theme" | "all";
   setThrows?: "mode" | "theme" | "all";
   /** `localStorage` is undefined (e.g. blocked before it exists). */
   noStorage?: boolean;
   /** Classes on <html> before the script runs; defaults to the SSR `dark`. */
   classes?: string[];
};

type Paint = { classes: string[]; colorScheme: string | undefined };

const throwsFor = (which: Run["getThrows"], key: string) =>
   which === "all" ||
   (which === "mode" && key === "theme-mode") ||
   (which === "theme" && key === "theme");

const initScript = new vm.Script(themeInitScript);
let current: Run = {};
let writes: string[] = [];
let classes = new Set<string>();
const style: { colorScheme?: string } = {};
const storage = {
   getItem(key: string) {
      if (throwsFor(current.getThrows, key)) throw new Error("storage blocked");
      const value =
         key === "theme-mode"
            ? current.mode
            : key === "theme"
              ? current.theme
              : undefined;
      return value === undefined ? null : value;
   },
   setItem(key: string, value: unknown) {
      if (throwsFor(current.setThrows, key)) throw new Error("quota exceeded");
      writes.push(`${key}=${String(value)}`);
   },
};
const sharedContext = vm.createContext({
   get localStorage() {
      return current.noStorage ? undefined : storage;
   },
   document: {
      documentElement: {
         classList: {
            add: (name: string) => classes.add(name),
            remove: (name: string) => classes.delete(name),
         },
         style,
      },
   },
   Date: function FakeDate() {
      return { getHours: () => current.hour };
   },
});

let lastPaint: Paint = { classes: [], colorScheme: undefined };

/** Runs the script; returns the ordered storage writes and records the <html> paint. */
function runInitScript(run: Run): string[] {
   current = run;
   writes = [];
   classes = new Set(run.classes ?? ["dark"]);
   delete style.colorScheme;
   assert.doesNotThrow(
      () => initScript.runInContext(sharedContext),
      JSON.stringify(run)
   );
   lastPaint = {
      classes: Array.from(classes).sort(),
      colorScheme: style.colorScheme,
   };
   return writes;
}

const readable = (run: Run, key: string) =>
   !run.noStorage && !throwsFor(run.getThrows, key);
const writable = (run: Run, key: string) =>
   !run.noStorage && !throwsFor(run.setThrows, key);
const clockAt = (hour: unknown) =>
   ({ getHours: () => hour }) as unknown as Date;

/** Writes the contract implies, computed with the pure functions. */
function expectedWrites(run: Run): string[] {
   const result: string[] = [];
   const stored = readable(run, "theme-mode") ? run.mode : null;
   const legacy = readable(run, "theme") ? run.theme : null;
   const mode = resolveStoredMode(stored, legacy);
   if (parseThemeMode(stored) === null && writable(run, "theme-mode"))
      result.push(`theme-mode=${mode}`);
   const resolved = resolveTheme(mode, clockAt(run.hour));
   if (writable(run, "theme")) result.push(`theme=${resolved}`);
   return result;
}

/** <html> state the contract implies (step 4b), independent of storage writes. */
function expectedPaint(run: Run): Paint {
   const stored = readable(run, "theme-mode") ? run.mode : null;
   const legacy = readable(run, "theme") ? run.theme : null;
   const resolved = resolveTheme(
      resolveStoredMode(stored, legacy),
      clockAt(run.hour)
   );
   const other = resolved === "light" ? "dark" : "light";
   const after = new Set(run.classes ?? ["dark"]);
   after.delete(other);
   after.add(resolved);
   return { classes: Array.from(after).sort(), colorScheme: resolved };
}

const HOURS: unknown[] = [
   ...Array.from({ length: 24 }, (_, hour) => hour),
   Number.NaN,
   undefined,
   6.5,
   -1,
   24,
   "7",
   Number.POSITIVE_INFINITY,
];

test("init script is small, ES5, and safe to inline", () => {
   assert.ok(
      themeInitScript.length <= 2048,
      `length ${themeInitScript.length}`
   );
   assert.doesNotMatch(themeInitScript, /<\/script|<!--/i);
   assert.doesNotMatch(themeInitScript, /=>|`|\b(?:const|let|class)\b/);
});

test("init script resolves hand-checked cases", () => {
   // Empty storage: Auto is stored, then the clock decides.
   assert.deepEqual(runInitScript({ hour: 5 }), [
      "theme-mode=auto",
      "theme=dark",
   ]);
   assert.deepEqual(runInitScript({ hour: 6 }), [
      "theme-mode=auto",
      "theme=light",
   ]);
   assert.deepEqual(runInitScript({ hour: 17 }), [
      "theme-mode=auto",
      "theme=light",
   ]);
   assert.deepEqual(runInitScript({ hour: 18 }), [
      "theme-mode=auto",
      "theme=dark",
   ]);
   // Legacy explicit choice survives the clock (FR-007).
   assert.deepEqual(runInitScript({ theme: "light", hour: 22 }), [
      "theme-mode=light",
      "theme=light",
   ]);
   assert.deepEqual(runInitScript({ theme: "dark", hour: 12 }), [
      "theme-mode=dark",
      "theme=dark",
   ]);
   // Legacy values that are not an explicit light/dark choice become Auto.
   assert.deepEqual(runInitScript({ theme: "system", hour: 12 }), [
      "theme-mode=auto",
      "theme=light",
   ]);
   assert.deepEqual(runInitScript({ mode: "bogus", theme: "auto", hour: 3 }), [
      "theme-mode=auto",
      "theme=dark",
   ]);
   // Invalid mode with a legacy theme migrates the legacy theme.
   assert.deepEqual(runInitScript({ mode: "Dark", theme: "light", hour: 3 }), [
      "theme-mode=light",
      "theme=light",
   ]);
   // A valid mode wins over the stored theme and is not rewritten.
   assert.deepEqual(runInitScript({ mode: "dark", theme: "light", hour: 12 }), [
      "theme=dark",
   ]);
   assert.deepEqual(runInitScript({ mode: "auto", theme: "dark", hour: 12 }), [
      "theme=light",
   ]);
   assert.deepEqual(runInitScript({ mode: "light", hour: 23 }), [
      "theme=light",
   ]);
   // Storage failures are isolated per access.
   assert.deepEqual(
      runInitScript({ getThrows: "mode", theme: "dark", hour: 12 }),
      ["theme-mode=dark", "theme=dark"]
   );
   assert.deepEqual(
      runInitScript({ setThrows: "mode", theme: "light", hour: 22 }),
      ["theme=light"]
   );
   assert.deepEqual(runInitScript({ setThrows: "theme", hour: 12 }), [
      "theme-mode=auto",
   ]);
   assert.deepEqual(runInitScript({ getThrows: "all", hour: 12 }), [
      "theme-mode=auto",
      "theme=light",
   ]);
   assert.deepEqual(
      runInitScript({ getThrows: "all", setThrows: "all", hour: 12 }),
      []
   );
});

test("init script agrees with the pure functions for every storage state and hour", () => {
   const modes: unknown[] = [
      undefined,
      "auto",
      "light",
      "dark",
      "Auto",
      "LIGHT",
      " dark",
      "",
      "system",
      7,
   ];
   const themes: unknown[] = [
      undefined,
      "light",
      "dark",
      "auto",
      "system",
      "Light",
      "",
      1,
   ];
   const failures: Pick<Run, "getThrows" | "setThrows" | "noStorage">[] = [
      {},
      { getThrows: "mode" },
      { getThrows: "theme" },
      { getThrows: "all" },
      { setThrows: "mode" },
      { setThrows: "theme" },
      { setThrows: "all" },
      { getThrows: "all", setThrows: "all" },
      { noStorage: true },
   ];
   const initialClasses: string[][] = [
      ["dark"],
      [],
      ["light"],
      ["dark", "light"],
      ["dark", "js"],
   ];
   let runs = 0;
   for (const mode of modes) {
      for (const theme of themes) {
         for (const failure of failures) {
            for (const hour of HOURS) {
               const run: Run = {
                  mode,
                  theme,
                  hour,
                  ...failure,
                  classes: initialClasses[runs % initialClasses.length],
               };
               const label = JSON.stringify(run) + ` hour=${String(hour)}`;
               const written = runInitScript(run);
               assert.deepEqual(written, expectedWrites(run), label);
               // The stored mode the script settles on is resolveStoredMode(...).
               const storedMode = written
                  .find((entry) => entry.startsWith("theme-mode="))
                  ?.slice("theme-mode=".length);
               if (storedMode !== undefined) {
                  assert.equal(
                     storedMode,
                     resolveStoredMode(
                        readable(run, "theme-mode") ? mode : null,
                        readable(run, "theme") ? theme : null
                     ),
                     label
                  );
               }
               assert.deepEqual(lastPaint, expectedPaint(run), label);
               runs++;
            }
         }
      }
   }
   assert.equal(runs, 10 * 8 * 9 * HOURS.length);
});

test("init script paints <html> for every hour, even with storage blocked", () => {
   const variants: Run[] = [
      {},
      { mode: "auto" },
      { getThrows: "all" },
      { setThrows: "all" },
      { getThrows: "all", setThrows: "all" },
      { noStorage: true },
   ];
   for (const variant of variants) {
      EXPECTED_BY_HOUR.forEach((theme, hour) => {
         const label = `${JSON.stringify(variant)} hour ${hour}`;
         // SSR default `dark`: replaced by light in the day, kept at night.
         runInitScript({ ...variant, hour, classes: ["dark"] });
         assert.deepEqual(
            lastPaint,
            { classes: [theme], colorScheme: theme },
            label
         );
         // The opposite class is removed and unrelated classes are kept.
         runInitScript({ ...variant, hour, classes: ["light", "dark", "x"] });
         assert.deepEqual(
            lastPaint,
            { classes: [theme, "x"].sort(), colorScheme: theme },
            label
         );
      });
   }
   // Explicit choices paint regardless of the clock.
   runInitScript({ mode: "light", hour: 23, classes: ["dark"] });
   assert.deepEqual(lastPaint, { classes: ["light"], colorScheme: "light" });
   runInitScript({ mode: "dark", hour: 12, classes: ["light"] });
   assert.deepEqual(lastPaint, { classes: ["dark"], colorScheme: "dark" });
   runInitScript({ theme: "light", hour: 2, getThrows: "mode" });
   assert.deepEqual(lastPaint, { classes: ["light"], colorScheme: "light" });
});

test("init script tolerates a partial or broken document", () => {
   const storageStub = { getItem: () => null, setItem: () => undefined };
   const noon = function NoonDate() {
      return { getHours: () => 12 };
   };
   const throwing = () => {
      throw new Error("blocked");
   };
   const documents: unknown[] = [
      undefined,
      null,
      {},
      { documentElement: null },
      { documentElement: {} },
      { documentElement: { classList: {} } },
      { documentElement: { style: null } },
      { documentElement: { classList: { add: throwing, remove: throwing } } },
      {
         get documentElement() {
            throw new Error("no element");
         },
      },
      {
         documentElement: {
            style: Object.defineProperty({}, "colorScheme", {
               set: throwing,
            }),
         },
      },
   ];
   for (const document of documents) {
      for (const localStorage of [storageStub, undefined]) {
         assert.doesNotThrow(
            () =>
               initScript.runInContext(
                  vm.createContext({ document, localStorage, Date: noon })
               ),
            String(document)
         );
      }
   }

   // Without classList, color-scheme is still set (and vice versa).
   const style: { colorScheme?: string } = {};
   initScript.runInContext(
      vm.createContext({
         document: { documentElement: { style } },
         Date: noon,
      })
   );
   assert.equal(style.colorScheme, "light");
   const added: string[] = [];
   initScript.runInContext(
      vm.createContext({
         document: {
            documentElement: {
               classList: {
                  add: (name: string) => added.push(name),
                  remove: () => undefined,
               },
            },
         },
         Date: noon,
      })
   );
   assert.deepEqual(added, ["light"]);
});

test("init script never throws without storage or a working clock", () => {
   const contexts: Record<string, unknown>[] = [
      {},
      { localStorage: undefined },
      { localStorage: null },
      { localStorage: {} },
      {
         localStorage: {
            getItem: () => null,
            setItem: () => undefined,
         },
         Date: function BrokenDate() {
            throw new Error("no clock");
         },
      },
      {
         localStorage: {
            getItem: () => null,
            setItem: () => undefined,
         },
         Date: undefined,
      },
   ];
   for (const globals of contexts) {
      assert.doesNotThrow(
         () => initScript.runInContext(vm.createContext(globals)),
         Object.keys(globals).join(",")
      );
   }
});
