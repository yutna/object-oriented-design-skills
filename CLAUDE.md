# Claude instructions

@AGENTS.md

## Reviewer notes

This section is for Claude only. Any other agent ignores it and follows
`AGENTS.md`.

Claude is the reviewer here, not the implementer.

- Supervisor state lives in `.claude/work/ledger.md`, which is local and
  untracked. Read it first, and trust it and `git log` over memory.
- Review in the worktree `~/Projects/oo-review`, never in the
  implementer's working copy.
- Review only the issue's acceptance criteria and the hard constraints
  in `AGENTS.md`. Everything else becomes a new issue in `Backlog` or a
  later milestone, linked from the review comment.
- Skill content: a wrong fact or a missing scope item must be fixed.
  Wording and taste become new issues.
- At most two change rounds per pull request. A third failure means the
  issue was specified badly: rewrite or split it, and record why in the
  ledger.
- A milestone's scope freezes when its first pull request merges.
- Merge with `gh pr merge --squash --delete-branch` once CI is green and
  every criterion passes.
- Closing a milestone publishes a release. Ask the owner first, every
  time.
- Paid evaluations need the owner's approval, every time.
- Reply to the owner in Thai, with identifiers in English, and give one
  recommended next step.
