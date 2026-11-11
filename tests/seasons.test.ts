import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
   SEASONS,
   SEASON_ATTRIBUTE,
   SEASON_LABELS,
   SEASON_STORAGE_KEY,
   availableSeasons,
   detectSeason,
   nextSeasonPreference,
   parseSeasonPreference,
   regionBandForTimeZone,
   resolveSeason,
   seasonForBand,
   seasonInitScript,
   seasonsForBand,
   type RegionBand,
   type Season,
   type SeasonPreference,
} from "../app/data/seasons";

// Written out by hand from the spec's season table; index = Date#getMonth() (Jan = 0).
const EXPECTED_SEASONS: Record<Exclude<RegionBand, "unknown">, Season[]> = {
   // prettier-ignore
   "north-temperate": ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"],
   // prettier-ignore
   "south-temperate": ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"],
   // prettier-ignore
   "north-tropical": ["dry", "dry", "dry", "dry", "dry", "wet", "wet", "wet", "wet", "wet", "wet", "dry"],
   // prettier-ignore
   "south-tropical": ["wet", "wet", "wet", "wet", "wet", "dry", "dry", "dry", "dry", "dry", "dry", "wet"],
};

const ZONES_BY_BAND: Record<RegionBand, unknown[]> = {
   "north-tropical": [
      "Asia/Manila",
      "Asia/Bangkok",
      "Asia/Ho_Chi_Minh",
      "Asia/Saigon",
      "Asia/Kolkata",
      "Asia/Calcutta",
      "Asia/Yangon",
      "Asia/Rangoon",
      "Asia/Singapore",
      "Asia/Hong_Kong",
      "Asia/Dhaka",
      "Africa/Lagos",
      "Africa/Asmera",
      "Africa/Kampala",
      "Africa/Libreville",
      "America/Mexico_City",
      "America/Bogota",
      "America/Havana",
      "America/Boa_Vista",
      "Pacific/Honolulu",
      "Pacific/Truk",
      "Pacific/Chuuk",
      "Pacific/Ponape",
      "US/Hawaii",
   ],
   "south-tropical": [
      "Asia/Jakarta",
      "Asia/Pontianak",
      "Asia/Ujung_Pandang",
      "America/Lima",
      "America/Manaus",
      "Africa/Nairobi",
      "Africa/Windhoek",
      "Australia/Darwin",
      "Australia/North",
      "Pacific/Fiji",
      "Pacific/Noumea",
      "Pacific/Galapagos",
      "Pacific/Enderbury",
      "Indian/Mauritius",
   ],
   "south-temperate": [
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Brisbane",
      "Australia/ACT",
      "Pacific/Auckland",
      "Pacific/Easter",
      "America/Argentina/Buenos_Aires",
      "America/Argentina/Salta",
      "America/Buenos_Aires",
      "America/Cordoba",
      "America/Mendoza",
      "America/Santiago",
      "America/Sao_Paulo",
      "Africa/Johannesburg",
      "Africa/Maputo",
      "Antarctica/McMurdo",
      "Atlantic/Stanley",
      "Brazil/East",
   ],
   "north-temperate": [
      "Europe/Berlin",
      "Europe/Kiev",
      "America/New_York",
      "America/Los_Angeles",
      "America/Indiana/Indianapolis",
      "America/Nassau",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Katmandu",
      "Asia/Kathmandu",
      "Asia/Muscat",
      "Africa/Cairo",
      "Atlantic/Faeroe",
      "Pacific/Midway",
      "Arctic/Longyearbyen",
   ],
   unknown: [
      "UTC",
      "GMT",
      "Etc/UTC",
      "Etc/GMT+8",
      "",
      null,
      undefined,
      42,
      "Mars/Olympus",
      "CET",
      "Asia/",
      "/Manila",
      "asia/manila",
      "constructor/x",
      "__proto__/x",
      "toString/Manila",
   ],
};

test("exposes the six seasons, labels, and shared keys", () => {
   assert.deepEqual(
      [...SEASONS],
      ["spring", "summer", "autumn", "winter", "wet", "dry"]
   );
   assert.deepEqual(SEASON_LABELS, {
      spring: "Spring",
      summer: "Summer",
      autumn: "Autumn",
      winter: "Winter",
      wet: "Wet season",
      dry: "Dry season",
   });
   assert.equal(SEASON_STORAGE_KEY, "season");
   assert.equal(SEASON_ATTRIBUTE, "data-season");
});

test("maps all 48 band and month combinations to the season table", () => {
   let checked = 0;
   for (const [band, seasons] of Object.entries(EXPECTED_SEASONS)) {
      assert.equal(seasons.length, 12);
      seasons.forEach((season, month) => {
         assert.equal(
            seasonForBand(band as RegionBand, month),
            season,
            `${band} month ${month}`
         );
         checked++;
      });
   }
   assert.equal(checked, 48);
});

test("has no season for unknown regions or invalid months", () => {
   for (let month = 0; month < 12; month++)
      assert.equal(seasonForBand("unknown", month), null);
   for (const month of [-1, 12, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(
         seasonForBand("north-temperate", month),
         null,
         `month ${month}`
      );
   }
   assert.equal(seasonForBand("constructor" as RegionBand, 0), null);
});

test("classifies time zones by their reference city", () => {
   for (const [band, zones] of Object.entries(ZONES_BY_BAND)) {
      for (const zone of zones) {
         assert.equal(
            regionBandForTimeZone(zone as string),
            band,
            String(zone)
         );
      }
   }
});

test("switches season exactly at month boundaries in local time", () => {
   const cases: [string, Date, Season | null][] = [
      ["Europe/Berlin", new Date(2026, 10, 30, 23, 59, 59), "autumn"],
      ["Europe/Berlin", new Date(2026, 11, 1, 0, 0, 0), "winter"],
      ["Europe/Berlin", new Date(2027, 1, 28, 23, 59), "winter"],
      ["Europe/Berlin", new Date(2027, 2, 1), "spring"],
      ["Australia/Sydney", new Date(2026, 10, 30), "spring"],
      ["Australia/Sydney", new Date(2026, 11, 1), "summer"],
      ["Australia/Sydney", new Date(2026, 4, 31), "autumn"],
      ["Australia/Sydney", new Date(2026, 5, 1), "winter"],
      ["Asia/Manila", new Date(2026, 10, 30), "wet"],
      ["Asia/Manila", new Date(2026, 11, 1), "dry"],
      ["Asia/Manila", new Date(2026, 4, 31), "dry"],
      ["Asia/Manila", new Date(2026, 5, 1), "wet"],
      ["Asia/Jakarta", new Date(2026, 4, 31), "wet"],
      ["Asia/Jakarta", new Date(2026, 5, 1), "dry"],
      ["Asia/Jakarta", new Date(2026, 10, 30), "dry"],
      ["Asia/Jakarta", new Date(2026, 11, 1), "wet"],
      ["UTC", new Date(2026, 11, 1), null],
      ["Europe/Berlin", new Date(Number.NaN), null],
   ];
   for (const [zone, date, season] of cases) {
      assert.equal(
         detectSeason(zone, date),
         season,
         `${zone} ${date.toString()}`
      );
   }
});

test("parses only valid stored preferences", () => {
   assert.equal(parseSeasonPreference("auto"), "auto");
   for (const season of SEASONS)
      assert.equal(parseSeasonPreference(season), season);
   for (const value of [
      "Winter",
      "AUTO",
      "fall",
      " winter",
      "",
      null,
      undefined,
      3,
      {},
      ["winter"],
   ]) {
      assert.equal(
         parseSeasonPreference(value),
         "auto",
         JSON.stringify(value) ?? String(value)
      );
   }
});

test("resolves manual preferences over detection", () => {
   const november = new Date(2026, 10, 10);
   assert.equal(resolveSeason("auto", "Asia/Manila", november), "wet");
   assert.equal(resolveSeason("auto", "Europe/Berlin", november), "autumn");
   assert.equal(resolveSeason("auto", "Australia/Sydney", november), "spring");
   assert.equal(resolveSeason("auto", "UTC", november), null);
   assert.equal(resolveSeason("auto", undefined, november), null);
   assert.equal(resolveSeason("dry", "Asia/Manila", november), "dry");
   assert.equal(resolveSeason("winter", "Europe/Berlin", november), "winter");
   assert.equal(
      resolveSeason("Bogus" as Season, "Europe/Berlin", november),
      "autumn"
   );
});

test("ignores manual seasons that do not occur in the region (FR-018)", () => {
   const november = new Date(2026, 10, 10);
   const july = new Date(2026, 6, 10);
   // Changed by FR-018: these used to return the stored season.
   assert.equal(resolveSeason("winter", "Asia/Manila", november), "wet");
   assert.equal(resolveSeason("dry", "UTC", november), null);
   assert.equal(resolveSeason("summer", "Asia/Jakarta", july), "dry");
   assert.equal(resolveSeason("wet", "Europe/Berlin", november), "autumn");
   assert.equal(resolveSeason("dry", "Australia/Sydney", july), "winter");
   assert.equal(resolveSeason("spring", undefined, november), null);
   assert.equal(resolveSeason("spring", "Mars/Olympus", november), null);
   // Available manual seasons still win, even over an invalid date.
   assert.equal(resolveSeason("wet", "Asia/Jakarta", july), "wet");
   assert.equal(resolveSeason("summer", "Australia/Sydney", july), "summer");
   assert.equal(
      resolveSeason("spring", "Europe/Berlin", new Date(Number.NaN)),
      "spring"
   );
   assert.equal(
      resolveSeason("wet", "Europe/Berlin", new Date(Number.NaN)),
      null
   );
});

test("lists the seasons each band offers, in toggle order", () => {
   assert.deepEqual(
      [...seasonsForBand("north-temperate")],
      ["spring", "summer", "autumn", "winter"]
   );
   assert.deepEqual(
      [...seasonsForBand("south-temperate")],
      ["spring", "summer", "autumn", "winter"]
   );
   assert.deepEqual([...seasonsForBand("north-tropical")], ["wet", "dry"]);
   assert.deepEqual([...seasonsForBand("south-tropical")], ["wet", "dry"]);
   assert.deepEqual([...seasonsForBand("unknown")], []);
   assert.deepEqual([...seasonsForBand("constructor" as RegionBand)], []);
});

test("lists the seasons available in a time zone", () => {
   const cases: [unknown, Season[]][] = [
      ["Europe/Berlin", ["spring", "summer", "autumn", "winter"]],
      ["Australia/Sydney", ["spring", "summer", "autumn", "winter"]],
      ["Asia/Manila", ["wet", "dry"]],
      ["Asia/Jakarta", ["wet", "dry"]],
      ["UTC", []],
      [null, []],
      [undefined, []],
      ["", []],
      ["Mars/Olympus", []],
      ["__proto__/x", []],
      [42, []],
   ];
   for (const [zone, seasons] of cases) {
      assert.deepEqual(
         [...availableSeasons(zone as string)],
         seasons,
         String(zone)
      );
   }
});

/** Presses the toggle from "auto" until it returns to "auto"; returns every preference shown. */
function cycleFromAuto(zone: unknown, date: Date): SeasonPreference[] {
   const seen: SeasonPreference[] = ["auto"];
   let preference: SeasonPreference = "auto";
   for (let i = 0; i < 10; i++) {
      preference = nextSeasonPreference(preference, zone as string, date);
      seen.push(preference);
      if (preference === "auto") break;
   }
   return seen;
}

test("cycles through the region's seasons and back to auto", () => {
   const cases: [string, Date, SeasonPreference[]][] = [
      // Detected autumn, winter, spring, summer in Berlin.
      [
         "Europe/Berlin",
         new Date(2026, 10, 11),
         ["auto", "winter", "spring", "summer", "auto"],
      ],
      [
         "Europe/Berlin",
         new Date(2026, 0, 11),
         ["auto", "spring", "summer", "autumn", "auto"],
      ],
      [
         "Europe/Berlin",
         new Date(2026, 3, 11),
         ["auto", "summer", "autumn", "winter", "auto"],
      ],
      [
         "Europe/Berlin",
         new Date(2026, 6, 11),
         ["auto", "autumn", "winter", "spring", "auto"],
      ],
      // Southern hemisphere: Sydney in January is summer, November spring.
      [
         "Australia/Sydney",
         new Date(2026, 0, 11),
         ["auto", "autumn", "winter", "spring", "auto"],
      ],
      [
         "Australia/Sydney",
         new Date(2026, 10, 11),
         ["auto", "summer", "autumn", "winter", "auto"],
      ],
      // Tropical: two seasons.
      ["Asia/Manila", new Date(2026, 10, 11), ["auto", "dry", "auto"]],
      ["Asia/Manila", new Date(2026, 0, 11), ["auto", "wet", "auto"]],
      ["Asia/Jakarta", new Date(2026, 6, 11), ["auto", "wet", "auto"]],
      ["Asia/Jakarta", new Date(2026, 0, 11), ["auto", "dry", "auto"]],
   ];
   for (const [zone, date, expected] of cases) {
      assert.deepEqual(
         cycleFromAuto(zone, date),
         expected,
         `${zone} ${date.toDateString()}`
      );
   }
});

test("advances from manual, unavailable, and invalid preferences", () => {
   const november = new Date(2026, 10, 11); // Berlin autumn, Manila wet
   const cases: [unknown, string, SeasonPreference][] = [
      // Manual seasons advance in order; the step onto the detected season is auto.
      ["winter", "Europe/Berlin", "spring"],
      ["spring", "Europe/Berlin", "summer"],
      ["summer", "Europe/Berlin", "auto"],
      ["dry", "Asia/Manila", "auto"],
      // Manual season equal to the detected one: cycles on to the next.
      ["autumn", "Europe/Berlin", "winter"],
      ["wet", "Asia/Manila", "dry"],
      // Stored season outside the region (or invalid): treated like auto.
      ["wet", "Europe/Berlin", "winter"],
      ["dry", "Europe/Berlin", "winter"],
      ["winter", "Asia/Manila", "dry"],
      ["summer", "Asia/Manila", "dry"],
      ["bogus", "Europe/Berlin", "winter"],
      ["Winter", "Asia/Manila", "dry"],
      [null, "Asia/Manila", "dry"],
   ];
   for (const [preference, zone, next] of cases) {
      assert.equal(
         nextSeasonPreference(preference as SeasonPreference, zone, november),
         next,
         `${String(preference)} in ${zone}`
      );
   }
   // No detected season: always auto.
   for (const zone of ["UTC", "Mars/Olympus", "", null, undefined]) {
      for (const preference of ["auto", ...SEASONS] as SeasonPreference[]) {
         assert.equal(
            nextSeasonPreference(preference, zone, november),
            "auto",
            `${String(zone)} ${preference}`
         );
      }
   }
   for (const preference of ["auto", "winter", "spring"] as SeasonPreference[])
      assert.equal(
         nextSeasonPreference(
            preference,
            "Europe/Berlin",
            new Date(Number.NaN)
         ),
         "auto"
      );
});

test("every band and month cycles through its list once and returns to auto", () => {
   // Literal toggle order per band (FR-018), independent of the implementation's tables.
   const zones: [string, Exclude<RegionBand, "unknown">, Season[]][] = [
      [
         "Europe/Berlin",
         "north-temperate",
         ["spring", "summer", "autumn", "winter"],
      ],
      [
         "Australia/Sydney",
         "south-temperate",
         ["spring", "summer", "autumn", "winter"],
      ],
      ["Asia/Manila", "north-tropical", ["wet", "dry"]],
      ["Asia/Jakarta", "south-tropical", ["wet", "dry"]],
   ];
   let checked = 0;
   for (const [zone, band, order] of zones) {
      for (let month = 0; month < 12; month++) {
         const date = new Date(2026, month, 15);
         const detected = EXPECTED_SEASONS[band][month];
         const start = order.indexOf(detected);
         const expected: SeasonPreference[] = ["auto"];
         for (let step = 1; step < order.length; step++)
            expected.push(order[(start + step) % order.length]);
         expected.push("auto");
         const cycle = cycleFromAuto(zone, date);
         assert.deepEqual(cycle, expected, `${zone} month ${month}`);
         assert.equal(cycle.length, order.length + 1);
         // Each manual season in the cycle resolves to itself; auto to the detected season.
         for (const preference of cycle)
            assert.equal(
               resolveSeason(preference, zone, date),
               preference === "auto" ? detected : preference
            );
         checked++;
      }
   }
   assert.equal(checked, 48);
});

type Run = {
   stored?: unknown;
   zone?: unknown;
   month?: number;
   storageThrows?: boolean;
   intlThrows?: boolean;
   setThrows?: boolean;
};

const initScript = new vm.Script(seasonInitScript);

function runInitScript(run: Run, globals?: Record<string, unknown>): string[] {
   const calls: string[] = [];
   const context = vm.createContext(
      globals ?? {
         document: {
            documentElement: {
               setAttribute(name: string, value: string) {
                  if (run.setThrows) throw new Error("setAttribute failed");
                  calls.push(`set ${name}=${value}`);
               },
               removeAttribute(name: string) {
                  calls.push(`remove ${name}`);
               },
            },
         },
         localStorage: {
            getItem(key: string) {
               if (run.storageThrows) throw new Error("storage blocked");
               return key === "season" && run.stored !== undefined
                  ? run.stored
                  : null;
            },
         },
         Intl: {
            DateTimeFormat() {
               if (run.intlThrows) throw new Error("no Intl");
               return { resolvedOptions: () => ({ timeZone: run.zone }) };
            },
         },
         Date: function FakeDate() {
            return { getMonth: () => run.month };
         },
      }
   );
   assert.doesNotThrow(() => initScript.runInContext(context));
   return calls;
}

function expectedCalls(run: Run): string[] {
   const zone =
      run.intlThrows || typeof run.zone !== "string" ? undefined : run.zone;
   const stored = run.storageThrows ? null : run.stored;
   const date =
      run.month === undefined
         ? new Date(Number.NaN)
         : new Date(2026, run.month, 15);
   const season = resolveSeason(parseSeasonPreference(stored), zone, date);
   return season ? [`set data-season=${season}`] : ["remove data-season"];
}

test("init script is small, valid, and safe to inline", () => {
   assert.ok(
      seasonInitScript.length <= 4096,
      `length ${seasonInitScript.length}`
   );
   assert.doesNotMatch(seasonInitScript, /<\/script|<!--/i);
   assert.doesNotMatch(seasonInitScript, /=>|`|\b(?:const|let|class)\b/);
});

test("init script agrees with resolveSeason for zones, months, and preferences", () => {
   const zones: unknown[] = [
      ...Object.values(ZONES_BY_BAND).flat(),
      "Africa/Harare",
      "Indian/Maldives",
      "Indian/Kerguelen",
      "Atlantic/Cape_Verde",
      "US/Samoa",
      "Mexico/BajaNorte",
   ];
   const preferences: unknown[] = [
      undefined,
      null,
      "auto",
      ...SEASONS,
      "Winter",
      "bogus",
      "",
      7,
   ];
   const months: (number | undefined)[] = [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      Number.NaN,
      undefined,
   ];
   let runs = 0;
   for (const zone of zones) {
      for (const stored of preferences) {
         for (const month of months) {
            const run = { zone, stored, month };
            assert.deepEqual(
               runInitScript(run),
               expectedCalls(run),
               JSON.stringify(run)
            );
            runs++;
         }
      }
   }
   assert.ok(runs > 3000);
});

test("init script falls back safely when browser APIs fail", () => {
   const runs: Run[] = [
      { storageThrows: true, zone: "Asia/Manila", month: 10 },
      { storageThrows: true, zone: "UTC", month: 10 },
      { intlThrows: true, stored: "auto", month: 10 },
      { intlThrows: true, stored: "summer", month: 10 },
      { storageThrows: true, intlThrows: true, month: 10 },
      { zone: undefined, month: 10 },
      { zone: "Europe/Berlin", month: 11 },
   ];
   for (const run of runs) {
      assert.deepEqual(
         runInitScript(run),
         expectedCalls(run),
         JSON.stringify(run)
      );
   }
   assert.deepEqual(runInitScript({ stored: "auto", zone: "UTC", month: 3 }), [
      "remove data-season",
   ]);
   assert.deepEqual(
      runInitScript({ storageThrows: true, intlThrows: true, month: 3 }),
      ["remove data-season"]
   );
   // Berlin (FR-018): winter is available there, so the script reaches setAttribute and
   // its throw is swallowed. (In UTC, winter is now ignored and the attribute is removed.)
   assert.deepEqual(
      runInitScript({
         setThrows: true,
         stored: "winter",
         zone: "Europe/Berlin",
         month: 3,
      }),
      []
   );
   assert.deepEqual(runInitScript({}, {}), []);
});

test("init script ignores stored seasons outside the region (FR-018)", () => {
   const cases: [Run, string[]][] = [
      [
         { stored: "winter", zone: "Asia/Manila", month: 10 },
         ["set data-season=wet"],
      ],
      [
         { stored: "dry", zone: "Asia/Manila", month: 10 },
         ["set data-season=dry"],
      ],
      [
         { stored: "wet", zone: "Europe/Berlin", month: 10 },
         ["set data-season=autumn"],
      ],
      [
         { stored: "winter", zone: "Europe/Berlin", month: 10 },
         ["set data-season=winter"],
      ],
      [
         { stored: "summer", zone: "Asia/Jakarta", month: 6 },
         ["set data-season=dry"],
      ],
      [
         { stored: "wet", zone: "Asia/Jakarta", month: 6 },
         ["set data-season=wet"],
      ],
      [
         { stored: "spring", zone: "Australia/Sydney", month: 6 },
         ["set data-season=spring"],
      ],
      [
         { stored: "dry", zone: "Australia/Sydney", month: 6 },
         ["set data-season=winter"],
      ],
      // Unknown region: any stored season is ignored and the attribute removed.
      [{ stored: "winter", zone: "UTC", month: 10 }, ["remove data-season"]],
      [
         { stored: "wet", zone: "Mars/Olympus", month: 10 },
         ["remove data-season"],
      ],
      [
         { stored: "summer", intlThrows: true, month: 10 },
         ["remove data-season"],
      ],
      // An available manual season needs no valid month; an unavailable one does.
      [{ stored: "spring", zone: "Europe/Berlin" }, ["set data-season=spring"]],
      [{ stored: "wet", zone: "Europe/Berlin" }, ["remove data-season"]],
   ];
   for (const [run, calls] of cases)
      assert.deepEqual(runInitScript(run), calls, JSON.stringify(run));
});

test("init script agrees with resolveSeason when storage or Intl fail", () => {
   const zones = [
      "Europe/Berlin",
      "Australia/Sydney",
      "Asia/Manila",
      "Asia/Jakarta",
      "UTC",
   ];
   const months = [0, 2, 5, 8, 10, 11, Number.NaN, undefined];
   let runs = 0;
   for (const zone of zones) {
      for (const stored of ["auto", ...SEASONS, "bogus", undefined]) {
         for (const month of months) {
            for (const failure of [
               { storageThrows: true },
               { intlThrows: true },
               { storageThrows: true, intlThrows: true },
            ]) {
               const run: Run = { zone, stored, month, ...failure };
               assert.deepEqual(
                  runInitScript(run),
                  expectedCalls(run),
                  JSON.stringify(run)
               );
               runs++;
            }
         }
      }
   }
   assert.equal(runs, 5 * 9 * 8 * 3);
});
