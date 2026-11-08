# AyosHub and BukidLink project content

## Scope (2026-11-08)
Replace the previous nine projects with AyosHub and BukidLink in Selected work. This is a bounded content update under the constitution's small-content exception; retain the existing presentation and architecture.

Acceptance criteria:
- Only AyosHub and BukidLink appear; no empty More projects archive.
- AyosHub has a captured prototype image, descriptive alt text, an Explore prototype link, and a backend GitHub source link.
- BukidLink has no image or placeholder. Its description covers the microservices backend and its source link targets BukidlinkServices.
- Both descriptions identify development status without claiming completed payments or production readiness.
- Remove the previous projects' nine unused PNG assets, preserving shared site assets.

## Evidence and asset provenance
AyosHub's owner repositories document customer/professional Expo apps, a Next.js admin, and an ASP.NET Core backend. Source: https://github.com/kamotekiddev/ayoshub-backend (currently private; linked at the owner's explicit request).

`public/images/project-image/ayoshub-banner.png` is a direct Playwright capture on 2026-11-08 of the public illustrative customer journey at https://p.superdesign.dev/draft/05a75f6c-45d5-446b-9362-f990e69ecdea . It is prototype evidence, not a shipped application screenshot.

BukidLink's mobile stack is supported by https://github.com/kamotekiddev/BukidLink.Market.Mobile (master), including package.json and product/category/cart/checkout interfaces. Its displayed source destination is the owner-supplied https://github.com/kamotekiddev/BukidlinkServices (public, master). Repository tree, Directory.Packages.props, StoreAPI/StoreAPI.csproj, and ProductCatalogAPI/Program.cs, InventoryAPI/Program.cs, OrderAPI/Program.cs confirm separate Auth, ProductCatalogAPI, InventoryAPI, OrderAPI, and StoreAPI services; ASP.NET Core (.NET 9); PostgreSQL persistence through EF Core/Npgsql; and RabbitMQ messaging through MassTransit. These are source-code claims, not production or end-to-end integration verification.

Removed unused project images for SecuKey, Chatio, WiseBites, Jobseek, Loopstudios, Chirp, Blogr, Sunnyside, and Movie Matters (approximately 8 MiB). No BukidLink image is included, per owner instruction.

## Verification
- `npm run lint` and `npx tsc --noEmit` pass.
- `npm run build` passes in `/tmp/portfolio-project-content-check`, an isolated source copy using the same dependencies. The initial in-place build encountered a shared/stale `.next` Turbopack artifact; isolation avoided interference with the workspace runtime.
- Playwright checks at 390, 768, and 1440 px in light/dark themes confirmed exactly two projects, no archive, no BukidLink image, and no horizontal overflow. Captured layouts were inspected.
- Rendered HTML assertions verified the two backend source destinations and absence of the redundant mobile/backend links.
- Reference audit found no remaining consumers of the nine deleted asset filenames.
- Atlas evidence and integration reviews found no blocking issues.
- `graphify update .` refreshed the code graph. Image/document semantic extraction is separate.
- `git diff --check` passes.
