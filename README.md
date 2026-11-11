# Joshua Dela Cruz’s portfolio

A single-page software engineering portfolio built with Next.js, React, Tailwind CSS, and Framer Motion. Dark by default, with a persistent light theme.

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. To validate the production build:

```sh
npm run lint
npx tsc --noEmit
npm run build
```

## Content

- Edit projects in `app/data/projects.ts`. Optional `featuredOrder` values select and order featured work; other projects appear in the native disclosure archive.
- Edit roles in `app/data/experiences.ts` and profile destinations in `app/data/social-links.ts`.
- Shared colors and the five-step type scale are in `app/globals.css`.
- The social preview is generated locally by `app/social-preview/route.tsx`. Original preview images are preserved in `app/assets/legacy-*.png`.

Set `NEXT_PUBLIC_SITE_URL` to the site's full public origin before building for a custom deployment. Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is used automatically when available; local development defaults to http://localhost:3000.

Project content and the archive work without JavaScript. Theme switching and progressive entrance motion use JavaScript; reduced-motion preferences are respected.

The accent colours and a subtle ambient effect follow the visitor's season: spring, summer, autumn, or winter by hemisphere, and wet or dry in the tropics. The season comes from the device time zone and month, with no location permission or network lookup, and the header's season control overrides it. Without JavaScript, or in an unrecognised time zone, the emerald design is shown. Season tables live in `app/data/seasons.ts`; palettes and effects live in `app/globals.css`.

See [redesign notes](docs/redesign-notes.md) for the visual direction, asset provenance, and verification details.

## Spec-driven development

New features follow GitHub Spec Kit: specify → plan → tasks → analyze → implement.
See [the SDD workflow](docs/spec-driven-development.md) and
[project constitution](.specify/memory/constitution.md) for the Codex skills and quality gates.
