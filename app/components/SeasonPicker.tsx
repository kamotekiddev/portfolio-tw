"use client";

import {
   useCallback,
   useEffect,
   useId,
   useRef,
   useState,
   type KeyboardEvent,
} from "react";
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
   detectSeason,
   parseSeasonPreference,
   preferenceForSelection,
   resolveSeason,
   type Season,
   type SeasonPreference,
} from "@/data/seasons";
import { useFlashLabel, useIconAnimation } from "./ThemeToggle";

const ICONS: Record<SeasonPreference, IconType> = {
   auto: FiCompass,
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

/** Sets or removes html[data-season] (only when it changes) and returns the season. */
function applySeason(preference: SeasonPreference): Season | null {
   const season = resolveSeason(preference, deviceTimeZone(), new Date());
   const root = document.documentElement;
   if (root.getAttribute(SEASON_ATTRIBUTE) !== season) {
      if (season) root.setAttribute(SEASON_ATTRIBUTE, season);
      else root.removeAttribute(SEASON_ATTRIBUTE);
   }
   return season;
}

export default function SeasonPicker() {
   // null until mounted, so server and first client render match.
   const [mode, setMode] = useState<SeasonPreference | null>(null);
   const [detected, setDetected] = useState<Season | null>(null);
   // The season actually applied to the page (drives the icon and names).
   const [applied, setApplied] = useState<Season | null>(null);
   const [open, setOpen] = useState(false);
   const [flash, showLabel, hideLabels] = useFlashLabel("season");
   const [animate, onAnimationEnd] = useIconAnimation(mode);
   const wrapperRef = useRef<HTMLDivElement>(null);
   const buttonRef = useRef<HTMLButtonElement>(null);
   const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
   const menuId = useId();

   // Mount: read the stored preference, re-apply it, and follow other tabs.
   useEffect(() => {
      const sync = () => {
         const preference = readPreference();
         setDetected(detectSeason(deviceTimeZone(), new Date()));
         setApplied(applySeason(preference));
         setMode(preference);
      };
      sync();
      const onStorage = (event: StorageEvent) => {
         if (event.key === null || event.key === SEASON_STORAGE_KEY) sync();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
   }, []);

   // Rows: every season in fixed order; an extra first "Automatic" item only when no
   // season is detected for this region (FR-019).
   const options: SeasonPreference[] = detected ? [...SEASONS] : ["auto", ...SEASONS];
   const isChecked = (option: SeasonPreference) =>
      option === "auto"
         ? mode === "auto"
         : mode === "auto"
           ? option === detected
           : option === mode;

   const close = useCallback((returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) buttonRef.current?.focus();
   }, []);

   const openMenu = () => {
      hideLabels();
      setDetected(detectSeason(deviceTimeZone(), new Date()));
      setOpen(true);
   };

   // Move focus to the checked item whenever the menu opens.
   useEffect(() => {
      if (!open) return;
      const index = Math.max(options.findIndex(isChecked), 0);
      itemRefs.current[index]?.focus();
      // Only on open; arrow keys manage focus afterwards.
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open]);

   useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: PointerEvent) => {
         if (!wrapperRef.current?.contains(event.target as Node)) close(false);
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
   }, [open, close]);

   const choose = (option: SeasonPreference) => {
      const next =
         option === "auto"
            ? "auto"
            : preferenceForSelection(option, deviceTimeZone(), new Date());
      sessionPreference = next;
      writePreference(next);
      setApplied(applySeason(next));
      setMode(next);
      close(true);
      showLabel();
   };

   const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
         event.preventDefault();
         openMenu();
      }
   };

   const onMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
      const items = itemRefs.current.slice(0, options.length);
      const current = items.findIndex((item) => item === document.activeElement);
      let next: number | null = null;
      switch (event.key) {
         case "ArrowDown":
            next = (current + 1) % options.length;
            break;
         case "ArrowUp":
            next = (current - 1 + options.length) % options.length;
            break;
         case "Home":
            next = 0;
            break;
         case "End":
            next = options.length - 1;
            break;
         case "Escape":
            event.preventDefault();
            close(true);
            return;
         case "Tab":
            // Move focus to the button before the menu unmounts so the browser's
            // own Tab continues from a live element in every engine.
            buttonRef.current?.focus();
            setOpen(false);
            return;
         default:
            return;
      }
      event.preventDefault();
      items[next]?.focus();
   };

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
      <div className="season-toggle-wrap" ref={wrapperRef}>
         <button
            ref={buttonRef}
            type="button"
            className="season-toggle"
            disabled={mode === null}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={name}
            data-animate={animate ? "true" : undefined}
            onAnimationEnd={onAnimationEnd}
            onClick={() => (open ? close(false) : openMenu())}
            onKeyDown={onButtonKeyDown}
         >
            {mode === null ? (
               // Before hydration: every icon, CSS shows the one matching
               // html[data-season] (the compass when absent, as without JS).
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
               // Keyed by the preference: a changed selection remounts and animates it.
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
         {open && (
            <ul
               id={menuId}
               role="menu"
               aria-label="Season"
               className="season-menu"
               onKeyDown={onMenuKeyDown}
            >
               {options.map((option, index) => {
                  const checked = isChecked(option);
                  const isAutomatic = option !== "auto" && option === detected;
                  const label =
                     option === "auto" ? "Automatic" : SEASON_LABELS[option];
                  const OptionIcon = ICONS[option];
                  return (
                     <li key={option} role="none">
                        <button
                           ref={(element) => {
                              itemRefs.current[index] = element;
                           }}
                           type="button"
                           role="menuitemradio"
                           aria-checked={checked ? "true" : "false"}
                           aria-label={isAutomatic ? `${label} (Automatic)` : label}
                           tabIndex={-1}
                           className="season-option"
                           onClick={() => choose(option)}
                        >
                           <OptionIcon aria-hidden="true" />
                           <span>{label}</span>
                           {isAutomatic && (
                              <span className="season-tag" aria-hidden="true">
                                 Automatic
                              </span>
                           )}
                        </button>
                     </li>
                  );
               })}
            </ul>
         )}
      </div>
   );
}
