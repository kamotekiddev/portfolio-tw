"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** Home sections the nav tracks, in page order (specs/006-active-nav-highlight). */
const SECTIONS = [
   { id: "work", label: "Work" },
   { id: "experience", label: "Experience" },
   { id: "about", label: "About" },
   { id: "contact", label: "Contact" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

/** The activation line sits this far down the viewport, below the sticky header. */
const LINE_RATIO = 0.3;
/** Margin below the scroll-padding offset, where a clicked or hash target lands. */
const LINE_BELOW_PADDING = 8;
/** A hash target stays current until scrolling has been quiet this long. */
const SETTLE_MS = 150;

function isSectionId(value: string): value is SectionId {
   return SECTIONS.some((section) => section.id === value);
}

/** The html scroll-padding-top in px (110, or 130 below 768px). */
function readScrollPadding(): number {
   return (
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0
   );
}

/**
 * Section crossing the activation line; Contact at the bottom; none above Work. The line
 * never sits above the scroll-padding offset, so on short viewports a section scrolled
 * into place by a link or hash is still the one under the line.
 */
function sectionAtLine(scrollPadding: number): SectionId | null {
   const root = document.documentElement;
   // A short final section may never reach the line, so the bottom of the page wins.
   if (window.innerHeight + window.scrollY >= root.scrollHeight - 2)
      return "contact";
   const line = Math.max(
      window.innerHeight * LINE_RATIO,
      scrollPadding + LINE_BELOW_PADDING
   );
   let current: SectionId | null = null;
   for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= line) current = id;
   }
   return current;
}

/**
 * Header links. The layout says which area the page belongs to: on blog pages Blog is
 * current (in the server HTML, so it works without JavaScript); on the home page the
 * section under the activation line is current, tracked on scroll.
 */
export default function MainNav({ current }: { current?: "home" | "blog" }) {
   const isHome = current === "home";
   const [section, setSection] = useState<SectionId | null>(null);
   // A section chosen by click, hash or history, held until its scroll settles.
   const [pinned, setPinned] = useState<SectionId | null>(null);
   // Next.js links change the URL with pushState (no hashchange), so clicks call this.
   const holdRef = useRef<((id: SectionId) => void) | null>(null);

   useEffect(() => {
      if (!isHome) return;
      let frame = 0;
      let settleTimer: ReturnType<typeof setTimeout> | undefined;
      let held: SectionId | null = null;
      let scrollPadding = readScrollPadding();

      // Passive scroll and resize listeners, at most one measurement per frame.
      const update = () => {
         cancelAnimationFrame(frame);
         frame = requestAnimationFrame(() => {
            if (!held) setSection(sectionAtLine(scrollPadding));
         });
      };
      const onResize = () => {
         scrollPadding = readScrollPadding();
         update();
      };
      // While a hash target is held, a smooth scroll passes other sections; they are
      // ignored until scrolling stops, then the line confirms (or corrects) the target.
      const release = () => {
         clearTimeout(settleTimer);
         settleTimer = setTimeout(() => {
            held = null;
            window.removeEventListener("scroll", release);
            // Both in one task so React commits them together (no flash of the old one).
            setSection(sectionAtLine(scrollPadding));
            setPinned(null);
         }, SETTLE_MS);
      };
      const hold = (id: SectionId) => {
         held = id;
         setPinned(id);
         window.removeEventListener("scroll", release);
         window.addEventListener("scroll", release, { passive: true });
         release();
      };
      // Compared raw: the ids are ASCII, and decoding would throw on hashes like "#%".
      const fromHash = () => {
         const id = window.location.hash.slice(1);
         if (isSectionId(id)) hold(id);
         else update();
      };

      fromHash();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", onResize);
      window.addEventListener("hashchange", fromHash);
      window.addEventListener("popstate", fromHash);
      holdRef.current = hold;
      return () => {
         cancelAnimationFrame(frame);
         clearTimeout(settleTimer);
         window.removeEventListener("scroll", update);
         window.removeEventListener("scroll", release);
         window.removeEventListener("resize", onResize);
         window.removeEventListener("hashchange", fromHash);
         window.removeEventListener("popstate", fromHash);
         holdRef.current = null;
         setSection(null);
         setPinned(null);
      };
   }, [isHome]);

   const currentSection = isHome ? (pinned ?? section) : null;

   return (
      <nav aria-label="Main navigation" className="main-nav">
         {SECTIONS.map(({ id, label }) => (
            <Link
               key={id}
               href={`/#${id}`}
               aria-current={currentSection === id ? "location" : undefined}
               onClick={(event) => {
                  // Plain clicks only: a modified click opens a new tab and does not scroll.
                  if (
                     event.button !== 0 ||
                     event.metaKey ||
                     event.ctrlKey ||
                     event.shiftKey ||
                     event.altKey
                  )
                     return;
                  holdRef.current?.(id);
               }}
            >
               {label}
            </Link>
         ))}
         <Link
            href="/blog"
            aria-current={current === "blog" ? "page" : undefined}
         >
            Blog
         </Link>
      </nav>
   );
}
