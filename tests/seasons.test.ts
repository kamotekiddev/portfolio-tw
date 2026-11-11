import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
   SEASONS,
   SEASON_ATTRIBUTE,
   SEASON_LABELS,
   SEASON_STORAGE_KEY,
   detectSeason,
   parseSeasonPreference,
   preferenceForSelection,
   regionBandForTimeZone,
   resolveSeason,
   seasonForBand,
   seasonInitScript,
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
   assert.equal(resolveSeason("winter", "Asia/Manila", november), "winter");
   assert.equal(resolveSeason("dry", "UTC", november), "dry");
   assert.equal(
      resolveSeason("Bogus" as Season, "Europe/Berlin", november),
      "autumn"
   );
});

test("honours any manual season in every region (FR-019)", () => {
   const november = new Date(2026, 10, 10);
   const cases: [Season, unknown, Season][] = [
      ["winter", "Asia/Manila", "winter"],
      ["summer", "Asia/Jakarta", "summer"],
      ["wet", "Europe/Berlin", "wet"],
      ["dry", "Australia/Sydney", "dry"],
      ["dry", "UTC", "dry"],
      ["spring", undefined, "spring"],
      ["autumn", "Mars/Olympus", "autumn"],
   ];
   for (const [preference, zone, season] of cases) {
      assert.equal(
         resolveSeason(preference, zone as string, november),
         season,
         `${preference} in ${String(zone)}`
      );
   }
   assert.equal(
      resolveSeason("wet", "Europe/Berlin", new Date(Number.NaN)),
      "wet"
   );
});

test("choosing the detected season means auto; any other is manual", () => {
   const november = new Date(2026, 10, 11); // Berlin autumn, Sydney spring, Manila wet, Jakarta dry
   const july = new Date(2026, 6, 11); // Berlin summer, Sydney winter, Manila wet, Jakarta dry
   const cases: [Season, string, Date, SeasonPreference][] = [
      ["autumn", "Europe/Berlin", november, "auto"],
      ["winter", "Europe/Berlin", november, "winter"],
      ["spring", "Europe/Berlin", november, "spring"],
      ["summer", "Europe/Berlin", november, "summer"],
      ["wet", "Europe/Berlin", november, "wet"],
      ["dry", "Europe/Berlin", november, "dry"],
      ["summer", "Europe/Berlin", july, "auto"],
      ["autumn", "Europe/Berlin", july, "autumn"],
      ["spring", "Australia/Sydney", november, "auto"],
      ["autumn", "Australia/Sydney", november, "autumn"],
      ["winter", "Australia/Sydney", july, "auto"],
      ["summer", "Australia/Sydney", july, "summer"],
      ["wet", "Asia/Manila", november, "auto"],
      ["dry", "Asia/Manila", november, "dry"],
      ["winter", "Asia/Manila", november, "winter"],
      ["wet", "Asia/Manila", july, "auto"],
      ["dry", "Asia/Jakarta", july, "auto"],
      ["wet", "Asia/Jakarta", july, "wet"],
      ["summer", "Asia/Jakarta", july, "summer"],
   ];
   for (const [season, zone, date, preference] of cases) {
      assert.equal(
         preferenceForSelection(season, zone, date),
         preference,
         `${season} in ${zone} ${date.toDateString()}`
      );
   }
   // No detected season (unknown region or invalid date): every choice is manual.
   for (const season of SEASONS) {
      for (const zone of ["UTC", "Mars/Olympus", "", null, undefined]) {
         assert.equal(
            preferenceForSelection(season, zone, november),
            season,
            `${season} in ${String(zone)}`
         );
      }
      assert.equal(
         preferenceForSelection(season, "Europe/Berlin", new Date(Number.NaN)),
         season
      );
   }
});

test("a chosen season resolves to itself for every band and month", () => {
   const zones = [
      "Europe/Berlin",
      "Australia/Sydney",
      "Asia/Manila",
      "Asia/Jakarta",
   ];
   let checked = 0;
   for (const zone of zones) {
      for (let month = 0; month < 12; month++) {
         const date = new Date(2026, month, 15);
         const detected = detectSeason(zone, date);
         let autos = 0;
         for (const season of SEASONS) {
            const preference = preferenceForSelection(season, zone, date);
            if (preference === "auto") autos++;
            assert.equal(resolveSeason(preference, zone, date), season);
            checked++;
         }
         assert.equal(autos, 1, `${zone} month ${month} (${detected})`);
      }
   }
   assert.equal(checked, 4 * 12 * 6);
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
   assert.deepEqual(
      runInitScript({
         setThrows: true,
         stored: "winter",
         zone: "UTC",
         month: 3,
      }),
      []
   );
   assert.deepEqual(runInitScript({}, {}), []);
});

test("init script applies a stored season in every region (FR-019)", () => {
   const cases: [Run, string[]][] = [
      [
         { stored: "winter", zone: "Asia/Manila", month: 10 },
         ["set data-season=winter"],
      ],
      [
         { stored: "summer", zone: "Asia/Jakarta", month: 6 },
         ["set data-season=summer"],
      ],
      [
         { stored: "wet", zone: "Europe/Berlin", month: 10 },
         ["set data-season=wet"],
      ],
      [
         { stored: "dry", zone: "Australia/Sydney", month: 6 },
         ["set data-season=dry"],
      ],
      [
         { stored: "winter", zone: "UTC", month: 10 },
         ["set data-season=winter"],
      ],
      [
         { stored: "wet", zone: "Mars/Olympus", month: 10 },
         ["set data-season=wet"],
      ],
      [
         { stored: "summer", intlThrows: true, month: 10 },
         ["set data-season=summer"],
      ],
      [{ stored: "spring", zone: "Europe/Berlin" }, ["set data-season=spring"]],
      // Auto (or nothing usable stored) in an unknown region removes the attribute.
      [{ stored: "auto", zone: "UTC", month: 10 }, ["remove data-season"]],
      [{ zone: "Mars/Olympus", month: 10 }, ["remove data-season"]],
      [{ stored: "Winter", zone: "UTC", month: 10 }, ["remove data-season"]],
      [{ stored: "auto", intlThrows: true, month: 10 }, ["remove data-season"]],
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
