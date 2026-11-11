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
   FiCheck,
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
   resolveSeason,
   type Season,
   type SeasonPreference,
} from "@/data/seasons";

const OPTIONS: SeasonPreference[] = ["auto", ...SEASONS];

const ICONS: Record<SeasonPreference, IconType> = {
   auto: FiCompass,
   spring: FiFeather,
   summer: FiSunrise,
   autumn: FiWind,
   winter: FiCloudSnow,
   wet: FiCloudRain,
   dry: FiThermometer,
};

function labelFor(preference: SeasonPreference) {
   return preference === "auto" ? "Automatic" : SEASON_LABELS[preference];
}

function deviceTimeZone(): string | null {
   try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
   } catch {
      return null;
   }
}

function readPreference(): SeasonPreference {
   try {
      return parseSeasonPreference(localStorage.getItem(SEASON_STORAGE_KEY));
   } catch {
      return "auto";
   }
}

function applyPreference(preference: SeasonPreference) {
   try {
      localStorage.setItem(SEASON_STORAGE_KEY, preference);
   } catch {
      // Storage can be unavailable; the choice still applies to this page view.
   }
   const season = resolveSeason(preference, deviceTimeZone(), new Date());
   const root = document.documentElement;
   if (season) root.setAttribute(SEASON_ATTRIBUTE, season);
   else root.removeAttribute(SEASON_ATTRIBUTE);
}

export default function SeasonPicker() {
   const [mounted, setMounted] = useState(false);
   const [preference, setPreference] = useState<SeasonPreference>("auto");
   const [detected, setDetected] = useState<Season | null>(null);
   const [open, setOpen] = useState(false);
   const wrapperRef = useRef<HTMLDivElement>(null);
   const buttonRef = useRef<HTMLButtonElement>(null);
   const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
   const menuId = useId();

   useEffect(() => {
      setPreference(readPreference());
      setDetected(detectSeason(deviceTimeZone(), new Date()));
      setMounted(true);
   }, []);

   const close = useCallback((returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) buttonRef.current?.focus();
   }, []);

   // Move focus to the checked item whenever the menu opens.
   useEffect(() => {
      if (!open) return;
      const index = Math.max(OPTIONS.indexOf(preference), 0);
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

   const choose = (next: SeasonPreference) => {
      applyPreference(next);
      setPreference(next);
      setDetected(detectSeason(deviceTimeZone(), new Date()));
      close(true);
   };

   const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
         event.preventDefault();
         setOpen(true);
      }
   };

   const onMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
      const items = itemRefs.current;
      const current = items.findIndex(
         (item) => item === document.activeElement
      );
      let next: number | null = null;
      switch (event.key) {
         case "ArrowDown":
            next = (current + 1) % OPTIONS.length;
            break;
         case "ArrowUp":
            next = (current - 1 + OPTIONS.length) % OPTIONS.length;
            break;
         case "Home":
            next = 0;
            break;
         case "End":
            next = OPTIONS.length - 1;
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

   const current = labelFor(preference);
   const Icon = ICONS[mounted ? preference : "auto"];

   return (
      <div className="season-picker" ref={wrapperRef}>
         <button
            ref={buttonRef}
            type="button"
            className="season-toggle"
            disabled={!mounted}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={`Season: ${mounted ? current : "Automatic"}`}
            onClick={() => (open ? close(false) : setOpen(true))}
            onKeyDown={onButtonKeyDown}
         >
            <Icon aria-hidden="true" />
         </button>
         {open && (
            <ul
               id={menuId}
               role="menu"
               aria-label="Season"
               className="season-menu"
               onKeyDown={onMenuKeyDown}
            >
               {OPTIONS.map((option, index) => {
                  const checked = option === preference;
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
                           aria-label={labelFor(option)}
                           tabIndex={-1}
                           className="season-option"
                           onClick={() => choose(option)}
                        >
                           <FiCheck className="season-check" aria-hidden="true" />
                           <OptionIcon aria-hidden="true" />
                           <span>{labelFor(option)}</span>
                           {option === "auto" && detected && (
                              <span className="season-hint" aria-hidden="true">
                                 {SEASON_LABELS[detected]}
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
