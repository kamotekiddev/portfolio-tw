# Joshua Dela Cruz’s portfolio

A single-page software and AI engineering portfolio built with Next.js, React, Tailwind CSS, and Framer Motion. Dark by default, with a persistent light theme.

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

See [redesign notes](docs/redesign-notes.md) for the visual direction, asset provenance, and verification details.
