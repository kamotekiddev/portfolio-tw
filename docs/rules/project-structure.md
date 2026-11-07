# Project structure and conventions

This is the existing portfolio baseline, not a scaffold for a replacement architecture.
The [constitution](../../.specify/memory/constitution.md) governs these conventions;
[redesign notes](../redesign-notes.md) document the current visual direction and asset provenance.
Document deliberate architectural or design changes in the feature specification and plan.

## Current folder responsibilities

```text
app/
  layout.tsx                    Root document, site metadata, font, theme provider
  globals.css                   Shared styles, colors, and typography
  (root)/(home)/
    layout.tsx                  Home shell, skip link, header, footer, entrance motion
    page.tsx                    Home section composition
    components/                 Home-specific portfolio sections
  components/                   Shared UI: header, footer, logo, theme toggle, motion
  context/                      Theme provider wrapper
  data/                         Editable project, experience, and social-link data
  types/                        Project and experience type declarations
  assets/                       Imported imagery and preserved legacy preview images
  social-preview/route.tsx      Generated social preview endpoint
  favicon.ico                   Site icon
public/                         Static URL-addressable assets, including project images
specs/                          Feature-artifact location when specifications are created
.specify/                       Spec Kit configuration, templates, scripts, constitution
.agents/skills/                  Repository-local Spec Kit skills
docs/                           Project documentation
  rules/                        Mandatory project rule files indexed by AGENTS.md
AGENTS.md                       Agent entry point and mandatory rules index
```

## Placement and architecture rules

- Use the existing Next.js App Router, React, TypeScript, and Tailwind conventions.
  Prefer server-rendered components; add client components only for browser-dependent work.
- Keep route pages and layouts in `app/`. Parenthesized route groups organize files without
  adding URL segments. Keep home-specific sections in the home components directory;
  place UI shared by multiple routes in `app/components/`.
- Keep editable project, experience, and contact destinations in `app/data/`, separate
  from presentation. Existing files are `projects.ts`, `experiences.ts`, and `social-links.ts`.
- Keep shared styling in `app/globals.css` unless the plan justifies another location.
  Preserve the established colors, typography, dark default, and persistent light theme.
- Use `app/types/` for shared domain declarations following the existing conventions.
  The `@/*` import alias resolves to `app/*`, not the repository root.
- Use `app/assets/` for imported assets and `public/` for assets served directly by URL.
  Preserve asset provenance and existing working project destinations.
- Do not introduce dependencies, services, or architectural layers without a documented
  requirement and rationale in the feature plan. Do not create speculative folders simply
  to match an imagined future architecture.
- Keep feature artifacts in `specs/<feature>/` and rules in `docs/rules/`. Update this map
  when implemented structure changes. Document planned structure separately from existing routes.

## Content, metadata, and accessibility rules

- Support portfolio claims, roles, project outcomes, links, and imagery with supplied content
  or verifiable evidence. Do not present an AI engineering focus as shipped AI experience.
- Preserve semantic HTML, keyboard access, visible focus, both themes, reduced-motion
  preferences, and content navigation without JavaScript. Motion must not hide content
  when scripts or animation are unavailable.
- Keep secrets out of version control. Use the intended public site origin for metadata
  and previews: `NEXT_PUBLIC_SITE_URL`, then `VERCEL_PROJECT_PRODUCTION_URL`, with the existing
  localhost fallback for local development. The preview endpoint is `/social-preview`.

## Verification rules

- For application changes, run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- Add targeted regression coverage for meaningful behavior changes. Check visual and
  interaction changes in a browser at mobile, tablet, and desktop sizes, including both
  themes and relevant accessibility behavior.
- Documentation-only and low-impact maintenance changes may use a short scope and direct
  verification note under the constitution. Check links, paths, preserved requirements,
  and `git diff --check` for rule edits.
- Record acceptance evidence and completed tasks in the feature artifacts. Report failed
  and unrun checks accurately. Refresh Graphify after code changes as required by
  [the Graphify rules](graphify.md).
