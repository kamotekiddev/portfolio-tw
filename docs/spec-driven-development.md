# Spec-driven development

This repository uses GitHub Spec Kit 1.2.6 with Codex skills installed in `.agents/skills/`.
The project principles are defined in [the constitution](../.specify/memory/constitution.md).

## Starting a change

In a Codex session opened at this repository root, invoke:

1. `$speckit-specify <describe the desired outcome and scope>`
2. `$speckit-clarify` if requirements need clarification.
3. `$speckit-plan <technical constraints relevant to the change>`
4. `$speckit-tasks`
5. `$speckit-analyze` and resolve critical inconsistencies.
6. `$speckit-implement`

Restart the Codex session if the newly installed skills are not visible. These are agent skills,
not shell commands. `$speckit-checklist` provides optional requirements-quality checks;
`$speckit-converge` can assess remaining work after implementation.

Feature artifacts live under `specs/<feature>/`: `spec.md`, `plan.md`, and `tasks.md`, with
supporting research and contracts as needed. Review the spec and plan before implementation.
Use a separate feature directory for each bounded change. Do not generate a retroactive spec
for the whole existing portfolio merely to start using the workflow.

## Verification

For application changes, run:

```sh
npm run lint
npx tsc --noEmit
npm run build
```

Add targeted behavioral checks and responsive browser review as required by the change.
Record results against the acceptance criteria and mark completed tasks in `tasks.md`.
Refresh Graphify after code changes with `graphify update .`.

Small copy, documentation, and maintenance fixes may use a short written scope and verification
note rather than the full feature workflow. The constitution defines this exception.

## Repository files

Commit `.specify/`, `.agents/skills/speckit-*/`, and feature specs so collaborators share the
same workflow. Keep generated local graph output ignored. No git automation extension was
installed; use the repository's normal branch and commit workflow.

To initialize this integration in another checkout if needed:

```sh
specify init --here --force --non-interactive --integration codex --integration-options="--skills" --script sh
```

Review generated changes when reinitializing or upgrading. Existing customizations must be
preserved deliberately. See the [official existing-project guide](https://github.github.com/spec-kit/how-to/existing-projects.html).
