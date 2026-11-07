# Spec-driven development

This project follows GitHub Spec Kit SDD. Read `.specify/memory/constitution.md`
before feature planning or implementation and follow `docs/spec-driven-development.md`.

- For features and material behavior changes, create or update a bounded spec, plan, and tasks
  before modifying application code. Maintain acceptance criteria and task completion evidence.
- Use the repo-local `.agents/skills/speckit-*` skills: specify → clarify (when needed) →
  plan → tasks → analyze → implement. Read the relevant skill instructions before each phase.
- Keep specs in `specs/<feature>/`. Existing application behavior is the baseline; no retroactive
  specification is required to begin a new change.
- Small copy, documentation, and maintenance fixes may use a short scope and verification note,
  as allowed by the constitution. Explicit user instructions take precedence.
- Graphify supplies implementation context; the constitution and feature specs govern intent.

## Governing documents

- [Project constitution](../../.specify/memory/constitution.md) — governing principles and quality gates.
- [SDD workflow guide](../spec-driven-development.md) — skill invocation and repository setup.
