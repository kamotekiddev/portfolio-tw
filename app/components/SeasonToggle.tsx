"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
   FiCloudRain,
   FiCloudSnow,
   FiCompass,
   FiFeather,
   FiSunrise,
   FiThermometer,
   FiWind,
} from "react-icons/fi";
import {
   SEASONS,
   SEASON_ATTRIBUTE,
   SEASON_LABELS,
   SEASON_STORAGE_KEY,
   availableSeasons,
   nextSeasonPreference,
   parseSeasonPreference,
   resolveSeason,
   type Season,
   type SeasonPreference,
} from "@/data/seasons";
import { useFlashLabel, useIconAnimation } from "./ThemeToggle";

const ICONS: Record<Season, IconType> = {
   spring: FiFeather,
   summer: FiSunrise,
   autumn: FiWind,
   winter: FiCloudSnow,
   wet: FiCloudRain,
   dry: FiThermometer,
};

/**
 * The last known preference for this page view. Module scope survives client-side
 * navigation (the header remounts per layout) and resets on a full page load. Used only
 * when storage cannot be read, so a choice lasts for the page view.
 */
let sessionPreference: SeasonPreference | null = null;

function deviceTimeZone(): string | null {
   try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
   } catch {
      return null;
   }
}

function readPreference(): SeasonPreference {
   try {
      const preference = parseSeasonPreference(
         localStorage.getItem(SEASON_STORAGE_KEY)
      );
      // Readable storage is authoritative (including storage events from other tabs).
      sessionPreference = preference;
      return preference;
   } catch {
      return sessionPreference ?? "auto";
   }
}

/** Writes only when the stored value differs, so tabs do not echo storage events. */
function writePreference(preference: SeasonPreference) {
   try {
      if (localStorage.getItem(SEASON_STORAGE_KEY) !== preference) {
         localStorage.setItem(SEASON_STORAGE_KEY, preference);
      }
   } catch {
      // Storage can be unavailable; the choice still applies to this page view.
   }
}

/** Sets or removes html[data-season] for the preference and returns the applied season. */
function applySeason(preference: SeasonPreference): Season | null {
   const season = resolveSeason(preference, deviceTimeZone(), new Date());
   const root = document.documentElement;
   // Write only on change: the pre-paint script already set it, and a redundant write
   // would show up as a second attribute mutation (and a style recalculation).
   if (season) {
      if (root.getAttribute(SEASON_ATTRIBUTE) !== season)
         root.setAttribute(SEASON_ATTRIBUTE, season);
   } else if (root.hasAttribute(SEASON_ATTRIBUTE)) {
      root.removeAttribute(SEASON_ATTRIBUTE);
   }
   return season;
}

/** A stored season outside the visitor's region counts as Automatic (FR-018). */
function effectiveMode(preference: SeasonPreference): SeasonPreference {
   return preference !== "auto" &&
      availableSeasons(deviceTimeZone()).indexOf(preference) >= 0
      ? preference
      : "auto";
}

export default function SeasonToggle() {
   // null until mounted, so server and first client render match.
   const [mode, setMode] = useState<SeasonPreference | null>(null);
   // The season actually applied to the page (drives the icon and names).
   const [applied, setApplied] = useState<Season | null>(null);
   const [flash, showLabel] = useFlashLabel("season");
   const [animate, onAnimationEnd] = useIconAnimation(mode);

   // Mount: read the stored preference, re-apply it, and follow other tabs.
   useEffect(() => {
      const sync = () => {
         const preference = readPreference();
         setApplied(applySeason(preference));
         setMode(effectiveMode(preference));
      };
      sync();
      const onStorage = (event: StorageEvent) => {
         if (event.key === null || event.key === SEASON_STORAGE_KEY) sync();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
   }, []);

   const lower = applied ? SEASON_LABELS[applied].toLowerCase() : null;
   const name =
      mode === null || (mode === "auto" && !lower)
         ? "Season: Auto"
         : mode === "auto"
           ? `Season: Auto (currently ${lower})`
           : `Season: ${SEASON_LABELS[mode]}`;
   const visibleLabel =
      mode === null || (mode === "auto" && !lower)
         ? "Auto"
         : mode === "auto"
           ? `Auto · ${lower} now`
           : SEASON_LABELS[mode];
   const Icon = applied ? ICONS[applied] : FiCompass;
   const showBadge = mode === null || mode === "auto";

   return (
      <div className="season-toggle-wrap">
         <button
            type="button"
            className="season-toggle"
            disabled={mode === null}
            aria-label={name}
            data-animate={animate ? "true" : undefined}
            onAnimationEnd={onAnimationEnd}
            onClick={() => {
               const next = nextSeasonPreference(
                  mode ?? "auto",
                  deviceTimeZone(),
                  new Date()
               );
               sessionPreference = next;
               writePreference(next);
               setApplied(applySeason(next));
               setMode(next);
               showLabel();
            }}
         >
            {mode === null ? (
               // Before hydration: every icon, CSS shows the one matching
               // html[data-season] (the compass when absent).
               <>
                  <FiCompass
                     className="season-toggle-icon season-toggle-icon-none"
                     aria-hidden="true"
                  />
                  {SEASONS.map((season) => {
                     const SeasonIcon = ICONS[season];
                     return (
                        <SeasonIcon
                           key={season}
                           className={`season-toggle-icon season-toggle-icon-${season}`}
                           aria-hidden="true"
                        />
                     );
                  })}
               </>
            ) : (
               // Keyed by mode: a press remounts and animates the icon.
               <Icon key={mode} aria-hidden="true" />
            )}
            {showBadge && (
               <span className="season-toggle-badge" aria-hidden="true">
                  A
               </span>
            )}
         </button>
         {/* Decorative: the button's accessible name already states the mode. */}
         <span
            className="season-toggle-label"
            aria-hidden="true"
            data-visible={flash ? "true" : undefined}
         >
            {visibleLabel}
         </span>
      </div>
   );
}
