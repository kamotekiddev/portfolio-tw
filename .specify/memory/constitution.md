<!--
Sync Impact Report
Version: unratified template → 1.0.0 (initial adoption)
Principles: template placeholders replaced with I–V below.
Added sections: Technology and Content Constraints; Development Workflow and Quality Gates.
Removed sections: none. Deferred placeholders: none.
Dependent templates consume this constitution at runtime; no template changes required.
-->
# Portfolio Constitution

## Core Principles

### I. Specifications Lead Implementation

Every feature and material behavior change MUST have a bounded specification with user
stories, scope, and observable acceptance criteria before implementation. Its implementation
plan and tasks MUST trace back to those requirements. Resolve ambiguities that affect scope
or correctness before dependent work. Small copy, documentation, and maintenance fixes MAY
use a short written scope and verification note instead of a full feature directory.

### II. Factual Content and Asset Provenance

Portfolio claims, roles, project outcomes, links, and imagery MUST be supported by supplied
content or verifiable evidence. AI engineering focus MUST NOT be presented as shipped AI
experience without evidence. Preserve asset provenance and working project destinations;
record intentional changes in the feature specification.

### III. Accessible, Progressive Experiences

Content and project navigation MUST remain usable without JavaScript. Interactive changes
MUST preserve semantic HTML, keyboard access, visible focus, both themes, responsive layouts,
and reduced-motion preferences. Motion MUST enhance content without hiding it when scripts
or animation are unavailable. Visual changes MUST be checked at mobile, tablet, and desktop sizes.

### IV. Simple Architecture and Explicit Boundaries

Use the existing Next.js App Router, React, TypeScript, and Tailwind conventions. Keep editable
portfolio data separate from presentation. Prefer server-rendered content and introduce client
components only for browser-dependent interactions. New dependencies, services, or architectural
layers MUST have a documented requirement and rationale in the plan.

### V. Verification Matches the Change

Every task MUST identify how its acceptance criteria will be verified. Application changes MUST
pass lint, TypeScript checking, and the production build. Behavior changes MUST include targeted
regression coverage when a defect would be meaningful; low-impact copy and formatting changes
can use direct inspection. Visual and interaction changes MUST include browser checks. Report
unrun checks and failures honestly; never describe an unperformed check as passing.

## Technology and Content Constraints

- The current application stack and design direction in `docs/redesign-notes.md` are the baseline.
  Specifications MUST identify deliberate changes to this baseline.
- Project, experience, and contact data remain in `app/data/`; shared styling lives in
  `app/globals.css` unless a plan justifies a change.
- Secrets MUST NOT be committed. Public metadata and social previews MUST use the intended site origin.
- This adoption governs future changes; it does not retroactively specify the existing application.

## Development Workflow and Quality Gates

1. Use `$speckit-specify` to define a bounded change in `specs/<feature>/spec.md`.
2. Use `$speckit-clarify` when requirements need resolution, then `$speckit-plan` to create
   the plan and check it against this constitution.
3. Use `$speckit-tasks` to produce ordered, verifiable tasks. Use `$speckit-analyze` before
   implementation to find requirement, plan, and task inconsistencies; resolve critical findings.
4. Use `$speckit-implement` to execute the tasks and record completion and verification evidence.
5. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` for application changes,
   plus the checks required by the feature. Document any environment blockers.
6. Update affected specifications and documentation when scope changes. Refresh the local graph
   with `graphify update .` after code changes; the graph supports discovery, while specs define intent.

## Governance

This constitution is the project's governing SDD document, subject to explicit user instructions.
Plans and reviews MUST check compliance and document justified exceptions and their consequences.
Amendments MUST state the reason, update the amendment date, and assess affected active specs.
Use semantic versioning: major for incompatible principle changes, minor for new or expanded
principles, patch for clarifications. See `AGENTS.md` and `docs/spec-driven-development.md`
for operational guidance. The initial version establishes governance for this existing repository.

**Version**: 1.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
