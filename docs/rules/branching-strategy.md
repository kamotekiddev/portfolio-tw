# Branching strategy

- Before implementing a completely new feature, fetch the repository's primary remote and
  identify its default branch (`main` or `master`). Create a dedicated feature branch from
  that freshly fetched remote-tracking branch, not from a local branch that may be stale
  or from another feature branch. Do this before changing application code.
- Use the remote's configured default branch; if it is unavailable and both `main` and
  `master` exist with no clear default, resolve the intended base before branching.
- Preserve all existing work. If unrelated changes prevent safely switching branches,
  isolate the feature in a separate worktree or resolve the conflict with the user. Never
  discard changes, reset work, or automatically stash changes to satisfy this rule.
- If fetching fails, report the blocker and do not claim that the feature is based on the
  latest default branch. Existing feature work continues on its feature branch; this rule
  does not require creating a new branch for every follow-up task.
