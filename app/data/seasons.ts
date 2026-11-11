// Seasonal theme data and detection. Pure and isomorphic: safe to import from server and client
// code. Edit the tables below; `seasonInitScript` is generated from the same tables.

export const SEASONS = [
   "spring",
   "summer",
   "autumn",
   "winter",
   "wet",
   "dry",
] as const;
export type Season = (typeof SEASONS)[number];
export type SeasonPreference = "auto" | Season;
export type RegionBand =
   | "north-temperate"
   | "south-temperate"
   | "north-tropical"
   | "south-tropical"
   | "unknown";

type KnownBand = Exclude<RegionBand, "unknown">;
type QuarterSeasons = [Season, Season, Season, Season];
type ZoneList = { [area: string]: string };

export const SEASON_LABELS: Record<Season, string> = {
   spring: "Spring",
   summer: "Summer",
   autumn: "Autumn",
   winter: "Winter",
   wet: "Wet season",
   dry: "Dry season",
};

export const SEASON_STORAGE_KEY = "season";
export const SEASON_ATTRIBUTE = "data-season";

/**
 * Season per band for each meteorological quarter, starting in December:
 * [Dec–Feb, Mar–May, Jun–Aug, Sep–Nov].
 */
const BAND_SEASONS: Record<KnownBand, QuarterSeasons> = {
   "north-temperate": ["winter", "spring", "summer", "autumn"],
   "south-temperate": ["summer", "autumn", "winter", "spring"],
   "north-tropical": ["dry", "dry", "wet", "wet"],
   "south-tropical": ["wet", "wet", "dry", "dry"],
};

/**
 * Default band for each IANA area (the part before the first "/"). Areas not listed here
 * (`Etc`, `SystemV`, …) and zones without an area (`UTC`, `GMT`, `CET`, …) are `unknown`.
 * `US`, `Canada`, `Mexico`, `Brazil`, and `Chile` are legacy alias areas.
 */
const AREA_BANDS: { [area: string]: KnownBand } = {
   Africa: "north-tropical",
   America: "north-temperate",
   Antarctica: "south-temperate",
   Arctic: "north-temperate",
   Asia: "north-temperate",
   Atlantic: "north-temperate",
   Australia: "south-temperate",
   Europe: "north-temperate",
   Indian: "south-tropical",
   Pacific: "south-tropical",
   Brazil: "south-tropical",
   Canada: "north-temperate",
   Chile: "south-temperate",
   Mexico: "north-tropical",
   US: "north-temperate",
};

/**
 * Zones whose reference city is outside its area's default band, as space-separated names
 * (the first segment after the area, so "Argentina" covers America/Argentina/*). Tropical
 * means the reference city lies between the Tropics (|latitude| < 23.44°). Old and new
 * spellings are both listed because browsers report either (Asia/Calcutta, Asia/Kolkata).
 *
 * Borderline choices:
 * - America/Sao_Paulo (23.55°S, on the tropic): south-temperate; it has temperate-style seasons.
 * - Asia/Dhaka (23.8°N, just outside): north-tropical; its year is the monsoon wet/dry cycle.
 * - Inside the tropics by latitude, kept tropical: America/Havana (23.1°N), America/Mazatlan
 *   (23.2°N), Asia/Hong_Kong (22.3°N), Africa/Windhoek (22.6°S), Pacific/Noumea (22.3°S),
 *   Pacific/Gambier (23.1°S, area default).
 * - Outside by latitude, kept temperate: Asia/Muscat (23.6°N), Asia/Karachi, Asia/Taipei,
 *   America/Nassau, Africa/Gaborone, Africa/Maputo, America/Asuncion, Australia/Brisbane.
 * - Near the equator: Africa/Libreville, Kampala, Sao_Tome, and America/Boa_Vista are north;
 *   Africa/Nairobi, Asia/Pontianak, Pacific/Nauru, and Pacific/Galapagos are south.
 */
const ZONE_EXCEPTIONS: Record<KnownBand, ZoneList> = {
   "north-temperate": {
      Africa: "Algiers Cairo Casablanca Ceuta El_Aaiun Tripoli Tunis",
      Mexico: "BajaNorte",
      Pacific: "Midway",
   },
   "south-temperate": {
      Africa: "Gaborone Johannesburg Maputo Maseru Mbabane",
      America:
         "Argentina Asuncion Buenos_Aires Catamarca Cordoba Coyhaique Jujuy Mendoza Montevideo Punta_Arenas Rosario Santiago Sao_Paulo",
      Atlantic: "South_Georgia Stanley",
      Brazil: "East",
      Indian: "Kerguelen",
      Pacific: "Auckland Chatham Easter Norfolk Pitcairn",
   },
   "north-tropical": {
      America:
         "Anguilla Antigua Aruba Bahia_Banderas Barbados Belize Boa_Vista Bogota Cancun Caracas Cayenne Cayman Costa_Rica Curacao Dominica El_Salvador Grand_Turk Grenada Guadeloupe Guatemala Guyana Havana Jamaica Kralendijk Lower_Princes Managua Marigot Martinique Mazatlan Merida Mexico_City Montserrat Panama Paramaribo Port-au-Prince Port_of_Spain Puerto_Rico Santo_Domingo St_Barthelemy St_Kitts St_Lucia St_Thomas St_Vincent Tegucigalpa Tortola Virgin",
      Asia: "Aden Bangkok Brunei Calcutta Colombo Dacca Dhaka Ho_Chi_Minh Hong_Kong Kolkata Kuala_Lumpur Kuching Macao Macau Manila Phnom_Penh Rangoon Saigon Singapore Vientiane Yangon",
      Atlantic: "Cape_Verde",
      Indian: "Maldives",
      Pacific:
         "Chuuk Guam Honolulu Johnston Kiritimati Kosrae Kwajalein Majuro Palau Pohnpei Ponape Saipan Tarawa Truk Wake Yap",
      US: "Hawaii",
   },
   "south-tropical": {
      Africa:
         "Blantyre Brazzaville Bujumbura Dar_es_Salaam Harare Kigali Kinshasa Luanda Lubumbashi Lusaka Nairobi Windhoek",
      America:
         "Araguaina Bahia Belem Campo_Grande Cuiaba Eirunepe Fortaleza Guayaquil La_Paz Lima Maceio Manaus Noronha Porto_Acre Porto_Velho Recife Rio_Branco Santarem",
      Asia: "Dili Jakarta Jayapura Makassar Pontianak Ujung_Pandang",
      Atlantic: "St_Helena",
      Australia: "Darwin Lindeman North",
      US: "Samoa",
   },
};

const hasOwn = (object: object, key: string) =>
   Object.prototype.hasOwnProperty.call(object, key);

export function regionBandForTimeZone(
   timeZone: string | null | undefined
): RegionBand {
   if (typeof timeZone !== "string") return "unknown";
   const slash = timeZone.indexOf("/");
   const area = timeZone.slice(0, slash);
   const city = timeZone.slice(slash + 1).split("/")[0];
   if (slash < 1 || !city || !hasOwn(AREA_BANDS, area)) return "unknown";
   const bands = Object.keys(ZONE_EXCEPTIONS) as KnownBand[];
   for (let i = 0; i < bands.length; i++) {
      const lists = ZONE_EXCEPTIONS[bands[i]];
      if (hasOwn(lists, area) && lists[area].split(" ").indexOf(city) >= 0)
         return bands[i];
   }
   return AREA_BANDS[area];
}

export function seasonForBand(
   band: RegionBand,
   monthIndex: number
): Season | null {
   if (!hasOwn(BAND_SEASONS, band)) return null;
   if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11)
      return null;
   return BAND_SEASONS[band as KnownBand][
      Math.floor(((monthIndex + 1) % 12) / 3)
   ];
}

export function detectSeason(
   timeZone: string | null | undefined,
   date: Date
): Season | null {
   return seasonForBand(regionBandForTimeZone(timeZone), date.getMonth());
}

export function parseSeasonPreference(value: unknown): SeasonPreference {
   return typeof value === "string" &&
      (SEASONS as readonly string[]).indexOf(value) >= 0
      ? (value as Season)
      : "auto";
}

export function resolveSeason(
   preference: SeasonPreference,
   timeZone: string | null | undefined,
   date: Date
): Season | null {
   const parsed = parseSeasonPreference(preference);
   return parsed === "auto" ? detectSeason(timeZone, date) : parsed;
}

// JSON for embedding in an inline <script>: "<" is escaped so "</script" and "<!--" cannot occur.
const embed = (value: unknown) =>
   JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Self-contained ES5 IIFE for an inline <script> in the root layout. It mirrors
 * `resolveSeason(parseSeasonPreference(stored), zone, new Date())` using the tables above,
 * then sets or removes `data-season` on <html>. Never throws.
 */
export const seasonInitScript = [
   "(function(){try{",
   `var A=${embed(AREA_BANDS)},X=${embed(ZONE_EXCEPTIONS)},Q=${embed(BAND_SEASONS)},`,
   `N=${embed(SEASONS)},h=Object.prototype.hasOwnProperty,p,z,i,a,c,b,s=null,r;`,
   `try{p=localStorage.getItem(${embed(SEASON_STORAGE_KEY)})}catch(e){}`,
   "if(typeof p==='string'&&N.indexOf(p)>=0)s=p;else{",
   "try{z=Intl.DateTimeFormat().resolvedOptions().timeZone}catch(e){}",
   "if(typeof z==='string'){i=z.indexOf('/');a=z.slice(0,i);c=z.slice(i+1).split('/')[0];",
   "if(i>0&&c&&h.call(A,a)){r=A[a];",
   "for(b in X)if(h.call(X,b)&&h.call(X[b],a)&&X[b][a].split(' ').indexOf(c)>=0){r=b;break}",
   "i=new Date().getMonth();",
   "if(i>=0&&i<=11&&i%1===0)s=Q[r][Math.floor((i+1)%12/3)]}}}",
   "r=document.documentElement;",
   `if(s)r.setAttribute(${embed(SEASON_ATTRIBUTE)},s);else r.removeAttribute(${embed(SEASON_ATTRIBUTE)})`,
   "}catch(e){}})();",
].join("");
