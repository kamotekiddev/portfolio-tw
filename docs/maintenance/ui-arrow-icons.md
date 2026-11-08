# UI arrow icons

Scope: replace keyboard-character arrows used as interface icons with the
installed Feather SVG icon set (`react-icons/fi`), already used by the theme
control. Cover the home work action, contact action, footer back-to-top action,
article back link, and empty-blog portfolio link. Preserve labels, destinations,
spacing, link states, and responsive layout. Article prose/code and the archive's
existing CSS-drawn plus/minus are content or geometric graphics, not text icons.

This is a small visual maintenance substitution under the constitution's scoped
note exception. It adds no dependencies or behavior. Decorative icons must be
hidden from assistive technology and not independently focusable.

Acceptance: all five arrows render as SVG, with accessible link names supplied by
the existing labels. No interface text-arrow glyph remains. Keyboard navigation,
back-link hover/focus underline, and mobile/desktop layout remain usable.

Verification completed:

- Lint, TypeScript, production build, and diff checks passed.
- Targeted Playwright checks at 390 and 1440px in both themes found no document
  overflow; rendered link SVGs have `aria-hidden="true"` and `focusable="false"`.
  Link labels remain View work, Contact on LinkedIn, Back to top, and Back to blog.
- Article navigation arrow appearance was screenshot-checked, including the
  retained continuous hover/focus underline. Footer uses inline-flex alignment.
- Empty-blog SVG branch was source-reviewed; it was not runtime-tested because
  the repository contains published articles and no content was altered for QA.
- Independent review found no blockers. The footer inline alignment issue found
  during integration was corrected before the final build/browser checks.
- `graphify update .` refreshed the code graph (697 nodes, 906 edges). No UI arrow
  glyph remains in application TSX/TS/CSS files; article Markdown was untouched.
- Local dev preview was restarted after build. No commit, push, or deployment.
