# Blog article alignment

Scope: make the article fill the existing portfolio content grid, aligning both
left and right edges of its heading, summary, and body with the shared header
container. Remove the article's separate 800px cap and the summary's inherited
paragraph cap. Keep shared responsive gutters. The blog index already follows
that grid. This is a small layout maintenance change under the constitution's
scoped-note exception; routing, content, typography, and publishing behavior are
unchanged.

Acceptance: article, heading, summary, body, and shared header content use the
same horizontal bounds at mobile, tablet, and desktop widths in both themes.
Articles do not cause document-level horizontal overflow; code remains internally
scrollable when required. Existing navigation remains usable.

Verification completed against the full-width result:

- `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed.
- Direct Playwright checks in light and dark themes confirmed article, heading,
  summary, and body match the shared container's left/right edges: 20–370px at
  390px, 32–736px at 768px, 120–1320px at 1440px, and 424–1624px at 2048px.
  Document scroll width equaled viewport width in every case.
- Desktop and mobile screenshots were captured and visually inspected. The
  article now fills the 1200px grid on desktop. Earlier index alignment, back
  navigation, and mobile code-scroll checks passed and their rules are unchanged.
- Independent review found no remaining width cap or overflow concern.
- `graphify update .` completed with no code graph topology changes. CSS is not
  modeled by its AST extractor.
- Local development preview was restarted after build. No commit, push, or
  production deployment performed.

## Back-link underline follow-up

Replace the back link's inherited text decoration with one scoped pseudo-element
line spanning the entire link, including the arrow/text gap. Hide it at rest and
show it on fine-pointer hover, active press, or visible keyboard focus. Restrict
hover to hover-capable fine pointers to prevent a persistent touch hover state. Preserve its 44px
minimum target, icon spacing, current-color hover treatment, and focus outline.
Other shared text links retain their existing decoration.

Lint, TypeScript, production build, diff checks, and Graphify refresh passed for
this follow-up. Targeted Playwright checks at 390 and 1440px in both themes
confirmed a continuous 1px line across the full 121.6px link width. Screenshot
inspection confirmed appearance. Keyboard tabbing reaches the link, its `/blog`
destination is unchanged, and the earlier navigation check passed.

Follow-up interaction verification: lint, TypeScript, production build, diff, and
Graphify refresh passed. In both desktop themes, the underline was hidden at
rest and visible on hover. Keyboard focus showed the underline and focus outline.
Touch emulation verified the underline stays hidden after release even when the
browser retains a hover pseudo-state. The CSS active rule is present, but the
headless browser did not expose an active state during the emulated touch hold,
so a real-device pressed-state visual check remains unverified.
