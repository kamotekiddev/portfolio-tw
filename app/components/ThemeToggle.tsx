"use client";

import {
   useCallback,
   useEffect,
   useRef,
   useState,
   type AnimationEvent,
} from "react";
import { useTheme } from "next-themes";
import { FiMoon, FiSun } from "react-icons/fi";
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

/** How long the mode label stays visible after an activation. */
const LABEL_FLASH_MS = 2000;
/** Clears the icon animation flag if animationend never arrives (animation is 220 ms). */
const ICON_ANIMATION_FALLBACK_MS = 400;
/** Dispatched on document when a header toggle shows its label; the other one hides its own. */
const HEADER_LABEL_EVENT = "header-toggle-label";

/**
 * Visible mode label shown briefly after each activation (FR-012), shared by the theme
 * and season toggles. One timer, restarted per activation, cleared on unmount. Showing
 * one header label hides the other, so only one is ever visible.
 */
export function useFlashLabel(id: string) {
   const [flash, setFlash] = useState(false);
   const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
   useEffect(() => {
      const onOther = (event: Event) => {
         if ((event as CustomEvent<string>).detail === id) return;
         clearTimeout(timer.current);
         setFlash(false);
      };
      document.addEventListener(HEADER_LABEL_EVENT, onOther);
      return () => {
         document.removeEventListener(HEADER_LABEL_EVENT, onOther);
         clearTimeout(timer.current);
      };
   }, [id]);
   const show = useCallback(() => {
      document.dispatchEvent(new CustomEvent(HEADER_LABEL_EVENT, { detail: id }));
      clearTimeout(timer.current);
      setFlash(true);
      timer.current = setTimeout(() => setFlash(false), LABEL_FLASH_MS);
   }, [id]);
   return [flash, show] as const;
}

/**
 * Icon animation (FR-013), shared by both toggles: true only for a mode change after
 * mount (activation or another tab), never for the first mode this instance renders, so
 * load, hydration and the remount after client-side navigation stay still. Callers key
 * the svg by mode so each change remounts it and restarts the CSS animation cleanly.
 */
export function useIconAnimation<T>(mode: T | null) {
   const [animate, setAnimate] = useState(false);
   const prevModeRef = useRef<T | null>(null);
   const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
   useEffect(() => () => clearTimeout(timer.current), []);
   useEffect(() => {
      if (mode === null) return;
      const previous = prevModeRef.current;
      prevModeRef.current = mode;
      if (previous === null || previous === mode) return;
      clearTimeout(timer.current);
      setAnimate(true);
      // Fallback in case animationend never fires (reduced motion, interrupted, hidden tab).
      timer.current = setTimeout(() => setAnimate(false), ICON_ANIMATION_FALLBACK_MS);
   }, [mode]);
   const onAnimationEnd = useCallback((event: AnimationEvent<HTMLElement>) => {
      if (event.animationName !== "theme-icon-in") return;
      clearTimeout(timer.current);
      setAnimate(false);
   }, []);
   return [animate, onAnimationEnd] as const;
}

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

   const [flash, showLabel] = useFlashLabel("theme");
   const [animate, onAnimationEnd] = useIconAnimation(mode);

   const current: ThemeMode = mode ?? "auto";
   const resolved = resolvedTheme === "light" ? "light" : "dark";
   const label =
      mode === null
         ? `Theme: ${THEME_MODE_LABELS.auto}`
         : mode === "auto"
           ? `Theme: ${THEME_MODE_LABELS.auto} (currently ${resolved})`
           : `Theme: ${THEME_MODE_LABELS[mode]}`;
   const visibleLabel =
      mode === "auto"
         ? `${THEME_MODE_LABELS.auto} · ${resolved} now`
         : THEME_MODE_LABELS[current];
   // The icon always shows the current theme; Auto adds an "A" badge (FR-005).
   const Icon = resolved === "light" ? FiSun : FiMoon;
   const showBadge = mode === null || mode === "auto";

   return (
      <div className="theme-toggle-wrap">
         <button
            type="button"
            className="theme-toggle"
            disabled={mode === null}
            aria-label={label}
            data-animate={animate ? "true" : undefined}
            onAnimationEnd={onAnimationEnd}
            onClick={() => {
               const next = nextThemeMode(current);
               sessionMode = next;
               setMode(next);
               apply(next); // writes theme-mode, then setTheme
               showLabel();
            }}
         >
            {mode === null ? (
               // Before hydration: both icons, CSS shows the one matching the <html>
               // class set by the init script (moon without JavaScript).
               <>
                  <FiSun className="theme-toggle-icon-light" aria-hidden="true" />
                  <FiMoon className="theme-toggle-icon-dark" aria-hidden="true" />
               </>
            ) : (
               // Keyed by mode: a mode change remounts and animates the icon, while the
               // automatic sun/moon swap in Auto keeps the key and is instant.
               <Icon key={current} aria-hidden="true" />
            )}
            {showBadge && (
               <span className="theme-toggle-badge" aria-hidden="true">
                  A
               </span>
            )}
         </button>
         {/* Decorative: the button's accessible name already states the mode. */}
         <span
            className="theme-toggle-label"
            aria-hidden="true"
            data-visible={flash ? "true" : undefined}
         >
            {visibleLabel}
         </span>
      </div>
   );
}
