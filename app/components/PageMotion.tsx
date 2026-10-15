"use client";

import { useEffect } from "react";
import { animate } from "framer-motion";

// Start animations only after content is present. No CSS or server-rendered
// hidden state: the complete page remains readable without JavaScript.
export default function PageMotion() {
   useEffect(() => {
      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (preference.matches || !("IntersectionObserver" in window)) return;

      const controls: Array<ReturnType<typeof animate>> = [];
      const ease = [0.22, 1, 0.36, 1] as const;
      document
         .querySelectorAll<HTMLElement>(".hero-line > span")
         .forEach((element, index) => {
            controls.push(
               animate(
                  element,
                  { y: ["104%", "0%"] },
                  { duration: 0.85, delay: index * 0.11, ease }
               )
            );
         });

      const observer = new IntersectionObserver(
         (entries) => {
            entries.forEach((entry) => {
               if (!entry.isIntersecting) return;
               const element = entry.target as HTMLElement;
               const picture = element.matches(
                  ".project-image, .about-portrait"
               );
               controls.push(
                  animate(
                     element,
                     picture
                        ? { scale: [0.98, 1], opacity: [0.8, 1] }
                        : { y: [18, 0], opacity: [0.65, 1] },
                     { duration: picture ? 0.9 : 0.65, ease }
                  )
               );
               observer.unobserve(element);
            });
         },
         { threshold: 0.12 }
      );

      document
         .querySelectorAll(
            ".hero-intro, .hero-actions, .section-intro > *, .project-image, .project-title-block, .project-description, .experience-intro, .experience-item, .about-portrait, .about-copy > *, .capabilities > h3, .capability-list > div, .contact-inner > h2, .contact-bottom > *, .footer-wordmark"
         )
         .forEach((element) => observer.observe(element));

      const finishMotion = () => {
         if (preference.matches) {
            observer.disconnect();
            controls.forEach((control) => control.complete());
         }
      };
      preference.addEventListener("change", finishMotion);
      return () => {
         observer.disconnect();
         controls.forEach((control) => control.complete());
         preference.removeEventListener("change", finishMotion);
      };
   }, []);

   return null;
}
