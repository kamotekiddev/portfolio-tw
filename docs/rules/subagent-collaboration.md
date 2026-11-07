# Subagent collaboration

- Always use subagents for project work. Engage **Atlas (Tech Lead)** at the start of each
  task to coordinate scope, technical decisions, task ownership, and integration review.
  For small documentation or maintenance changes, a focused Atlas review is sufficient.
- For implementation, have Atlas divide the work into bounded responsibilities and use
  specialist subagents where appropriate: Anvil for backend work, Pixel for frontend work,
  Echo for verification, and Sage for independent review. Parallelize independent work;
  keep dependent work ordered and avoid overlapping file ownership.
- Tell every editing subagent which files or modules it owns, that it is not alone in the
  codebase, and that it must preserve and accommodate other agents' changes. Include the
  Graphify discovery rules in `docs/rules/graphify.md` in every prompt that explores code, and pass along relevant
  constitution, specification, and verification requirements.
- The primary agent remains responsible for integrating results, resolving findings,
  completing verification, and reporting the outcome accurately.
