import { flushSync } from "react-dom";

/**
 * Circle-reveal for visitor-started theme and season changes (specs/005-theme-transition).
 * Only activation handlers call this; automatic changes (mount, Auto sync, other tabs)
 * keep applying instantly.
 */

/** Duration of the circle reveal. */
export const THEME_REVEAL_MS = 500;
/** The site's ease-out curve (matches the CSS motion tokens). */
const REVEAL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Minimal View Transitions types: the project's TypeScript DOM lib predates the API. */
interface RevealTransition {
   ready: Promise<void>;
   finished: Promise<void>;
   skipTransition(): void;
}
type StartViewTransition = (callback: () => void) => RevealTransition;

/** The running reveal, skipped when another press starts a new one. */
let running: RevealTransition | null = null;
/** The clip-path animation of the running reveal, once started. */
let reveal: Animation | null = null;

/**
 * Ends the running reveal at once; skipping still applies its update. The clip-path
 * animation is cancelled first: in Chromium, skipping a transition while its pseudo-element
 * animation runs and then starting another one crashed the renderer during verification.
 */
function skipRunning() {
   reveal?.cancel();
   reveal = null;
   running?.skipTransition();
}

/*
 * While a view transition is active the browser hit-tests every pointer event to <html>,
 * so clicks during the reveal would be lost (rapid toggle presses, a nav link right after
 * a press). Instead of dropping them, a pointerdown skips the reveal and the click that
 * follows (whose target is <html>) is replayed on the element under the pointer.
 */
/** Set by a pointerdown that skipped a reveal, until its click arrives. */
let awaitingClick = false;
let awaitingTimer: ReturnType<typeof setTimeout> | undefined;
let listening = false;
/** Elements a replayed click should land on (the nearest interactive ancestor). */
const INTERACTIVE = "a,button,[role=menuitemradio],input,label,summary,[tabindex]";

function onPointerDown() {
   if (!running) return;
   awaitingClick = true;
   // If no click follows (drag, cancelled press), stop listening shortly after.
   clearTimeout(awaitingTimer);
   awaitingTimer = setTimeout(() => {
      awaitingClick = false;
      stopListeningIfIdle();
   }, 1000);
   skipRunning();
}

function onClick(event: MouseEvent) {
   if (event.target !== document.documentElement || !(running || awaitingClick)) return;
   event.preventDefault();
   event.stopPropagation();
   awaitingClick = false;
   clearTimeout(awaitingTimer);
   const { clientX, clientY } = event;
   const settled = running ? running.finished.catch(() => {}) : Promise.resolve();
   // Replay on the next frame, once the pseudo-element tree is gone and hit-testing works.
   void settled.then(() => requestAnimationFrame(() => {
      stopListeningIfIdle();
      const hit = document.elementFromPoint(clientX, clientY);
      if (!hit || hit === document.documentElement || hit === document.body) return;
      const target = hit.closest(INTERACTIVE) ?? hit;
      // Focus first, as a real press does on pointerdown, so handlers that move focus
      // (the season menu returning focus to its trigger) keep the last word.
      if (target instanceof HTMLElement && target.matches(INTERACTIVE)) {
         target.focus({ preventScroll: true });
      }
      if (target instanceof HTMLElement) target.click();
   }));
}

function startListening() {
   if (listening) return;
   listening = true;
   window.addEventListener("pointerdown", onPointerDown, true);
   window.addEventListener("click", onClick, true);
}

function stopListeningIfIdle() {
   if (!listening || running || awaitingClick) return;
   listening = false;
   window.removeEventListener("pointerdown", onPointerDown, true);
   window.removeEventListener("click", onClick, true);
}

/**
 * Applies `update` with a circle reveal centred on `origin`. Falls back to calling
 * `update` directly when there is no origin, no View Transitions support, or the
 * visitor prefers reduced motion.
 */
export function runThemeTransition(origin: HTMLElement | null, update: () => void): void {
   const start = (document as Document & { startViewTransition?: StartViewTransition })
      .startViewTransition;
   if (
      !origin ||
      typeof start !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
   ) {
      update();
      return;
   }

   // A second press while a reveal runs (keyboard, or a replayed click) ends the previous
   // reveal at once; skipping still applies its update, so presses never queue up.
   skipRunning();

   const rect = origin.getBoundingClientRect();
   const x = rect.left + rect.width / 2;
   const y = rect.top + rect.height / 2;
   const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
   );

   // flushSync makes React (and next-themes' effect that writes the <html> class) commit
   // before the callback returns, so the browser snapshots the new appearance.
   const transition = start.call(document, () => flushSync(update));
   running = transition;
   startListening();

   transition.ready
      .then(() => {
         if (running !== transition) return;
         reveal = document.documentElement.animate(
            {
               clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${radius}px at ${x}px ${y}px)`,
               ],
            },
            {
               duration: THEME_REVEAL_MS,
               easing: REVEAL_EASING,
               pseudoElement: "::view-transition-new(root)",
            }
         );
      })
      // Rejects when skipped or when the update throws; the update itself still ran.
      .catch(() => {});
   transition.finished
      .catch(() => {})
      .finally(() => {
         if (running === transition) {
            running = null;
            reveal = null;
         }
         stopListeningIfIdle();
      });
}
