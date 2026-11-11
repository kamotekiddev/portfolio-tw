"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { FiClock, FiMoon, FiSun } from "react-icons/fi";
import {
   NEXT_THEMES_STORAGE_KEY,
   THEME_MODE_LABELS,
   THEME_MODE_STORAGE_KEY,
   msUntilNextThemeChange,
   nextThemeMode,
   resolveStoredMode,
   resolveTheme,
   type ThemeMode,
} from "@/data/theme-schedule";

/**
 * The last known mode for this page view. Module scope survives client-side navigation
 * (the header, and so this toggle, remounts per layout) and resets on a full page load.
 * Used only when storage cannot be read, so a manual choice lasts for the page view.
 */
let sessionMode: ThemeMode | null = null;

/** Same rule as themeInitScript: stored mode, else an explicit legacy theme, else auto. */
function readMode(): ThemeMode {
   try {
      const mode = resolveStoredMode(
         localStorage.getItem(THEME_MODE_STORAGE_KEY),
         localStorage.getItem(NEXT_THEMES_STORAGE_KEY)
      );
      // Readable storage is authoritative (including storage events from other tabs).
      sessionMode = mode;
      return mode;
   } catch {
      return sessionMode ?? "auto";
   }
}

/**
 * Persists the mode before a theme is applied, so the clock-written `theme` key is never
 * mistaken for a legacy explicit choice. Skips unchanged values so tabs do not echo
 * storage events back and forth.
 */
function writeMode(mode: ThemeMode) {
   try {
      if (localStorage.getItem(THEME_MODE_STORAGE_KEY) !== mode) {
         localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
      }
   } catch {
      // Storage unavailable: the theme still applies for this page view.
   }
}

const ICONS = { auto: FiClock, light: FiSun, dark: FiMoon } as const;

export default function ThemeToggle() {
   const { resolvedTheme, setTheme } = useTheme();
   // null until mounted, so server and first client render match.
   const [mode, setMode] = useState<ThemeMode | null>(null);

   // next-themes recreates setTheme when the theme changes; a ref keeps timers
   // and listeners pointing at the current one without re-arming them.
   const setThemeRef = useRef(setTheme);
   useEffect(() => {
      setThemeRef.current = setTheme;
   }, [setTheme]);

   // Every theme application (click, mount, Auto sync, other-tab change) writes the
   // mode first, then lets next-themes write the resolved `theme`.
   const apply = useCallback((next: ThemeMode) => {
      writeMode(next);
      setThemeRef.current(resolveTheme(next, new Date()));
   }, []);

   // Mount: read the stored mode (migrating legacy choices) and follow other tabs.
   useEffect(() => {
      const initial = readMode();
      setMode(initial);
      apply(initial);

      const onStorage = (event: StorageEvent) => {
         if (
            event.key !== null &&
            event.key !== THEME_MODE_STORAGE_KEY &&
            event.key !== NEXT_THEMES_STORAGE_KEY
         )
            return;
         const next = readMode();
         setMode(next);
         apply(next);
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
   }, [apply]);

   // Auto only: re-resolve at the next 06:00/18:00 boundary and when the page
   // becomes visible or focused again (timers can be throttled or slept through).
   useEffect(() => {
      if (mode !== "auto") return;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const sync = () => {
         apply("auto");
         clearTimeout(timer);
         timer = setTimeout(sync, msUntilNextThemeChange(new Date()) + 250);
      };
      const onVisibility = () => {
         if (document.visibilityState === "visible") sync();
      };

      sync();
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", sync);
      return () => {
         clearTimeout(timer);
         document.removeEventListener("visibilitychange", onVisibility);
         window.removeEventListener("focus", sync);
      };
   }, [mode, apply]);

   const current: ThemeMode = mode ?? "auto";
   const label =
      mode === null
         ? `Theme: ${THEME_MODE_LABELS.auto}`
         : mode === "auto"
           ? `Theme: ${THEME_MODE_LABELS.auto} (currently ${
                resolvedTheme === "light" ? "light" : "dark"
             })`
           : `Theme: ${THEME_MODE_LABELS[mode]}`;
   const Icon = ICONS[current];

   return (
      <button
         type="button"
         className="theme-toggle"
         disabled={mode === null}
         aria-label={label}
         onClick={() => {
            const next = nextThemeMode(current);
            sessionMode = next;
            setMode(next);
            apply(next); // writes theme-mode, then setTheme
         }}
      >
         <Icon aria-hidden="true" />
      </button>
   );
}
