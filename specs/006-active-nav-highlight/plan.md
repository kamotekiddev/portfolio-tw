# Implementation Plan: Highlight the current navigation item

**Spec**: [spec.md](spec.md)

## Approach
Move the five links from `Header.tsx` into a new client component, `app/components/MainNav.tsx`.
- The layouts pass `current` to `Header`: `"blog"` from the blog layout, `"home"` from the home layout, nothing from `app/not-found.tsx`. The Blog highlight is therefore in the server HTML and can never mismatch during hydration.
- On home, a passive scroll and resize listener runs a rAF-throttled check of `#work`, `#experience`, `#about` and `#contact` against an activation line at `max(30 % of the viewport, scroll-padding-top + 8px)`. (Review: a percentage-based IntersectionObserver band failed on short viewports and at fractional DPR.) The section crossing that line is current. At the bottom of the page Contact wins, and above the first section nothing is current.
- On `hashchange` / `popstate`, and on load with a hash, the hash target becomes current right away. The observer then confirms it once the scroll settles.
- Styles live in `app/globals.css`: `.main-nav a[aria-current]` uses `color: var(--accent)` and `text-decoration-color: currentColor`. The colour transition is added only under `prefers-reduced-motion: no-preference`.
- `Header.tsx` stays a server component and renders `<MainNav />`.

## Constitution check
I spec first ✔ · II no content change ✔ · III progressive (Blog highlight works without JS, the scroll-spy is an enhancement), AA contrast, reduced motion, 390/768/1440 checks ✔ · IV one small client component, no dependency ✔ · V lint/tsc/build plus Playwright regression ✔

## Files and owners
| File | Owner |
|------|-------|
| `app/components/MainNav.tsx` (new), `app/components/Header.tsx`, `app/globals.css` (nav current rules only), `docs/rules/project-structure.md` | Pixel |
| `tests/nav.spec.ts` (new), `playwright.config.ts` project entry | Echo |
| Review | Sage |
| Spec, integration, evidence | Atlas |
