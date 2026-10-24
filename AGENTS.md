# Agent instructions

This repository builds `object-oriented-design-skills`: Agent Skills that
carry object-oriented design rules, shipped as Claude Code plugins. Two
agents work on it.

- **The implementer** does every issue whose body says
  `Owner: implementer`. If you are not Claude, this is you.
- **The reviewer** (Claude) writes the issues, reviews pull requests,
  merges them, and closes milestones with the owner's approval.

Read this whole file before your first change. This file is the
contract; the issue is the task.

## What is here

```text
.claude-plugin/marketplace.json   one marketplace, several plugins
plugins/core/                     the plugin object-oriented-design-skills
  .claude-plugin/plugin.json
  skills/<skill-name>/SKILL.md
  skills/<skill-name>/references/*.md
plugins/<family>/                 language plugins, from v0.16.0
scripts/                          entry scripts, one per check or tool
scripts/lib/                      the classes every script uses
test/                             node:test unit tests and fixtures
evals/                            routing cases, scenarios, eval cases
```

Some of these arrive in later milestones. Do not create a directory
before the issue that introduces it.

## Pick the next issue

Run this, then take the first issue it prints that you may take:

```sh
gh issue list --state open --limit 200 \
  --json number,title,milestone,labels,body --jq '
  [.[] | select(.milestone.title // "" | test("^v[0-9]"))
   | select([.labels[].name] | index("blocked") | not)
   | select(.body | test("Owner: implementer"))
   | {n: .number, t: .title,
      m: (.milestone.title | ltrimstr("v") | split(".")
          | map(tonumber))}]
  | sort_by(.m, .n) | .[] | "#\(.n) \(.t)"'
```

Skip an issue when either is true:

- an open pull request already says `Closes #N` for it;
- its `Depends on` line names an issue that is still open.

Finish your own work before new work: if one of your open pull requests
has a `REVIEW: CHANGES REQUESTED` comment newer than your last push, fix
that pull request first.

Never take an issue from `Backlog` or one without a milestone.

## Do one issue

1. Read the issue. Read only the links in its Context section.
2. Branch from the latest `main` and open a draft pull request:

   ```sh
   git fetch origin
   git switch -c <type>/<N>-<slug> origin/main
   git commit --allow-empty -m "<type>: <summary>"
   git push -u origin HEAD
   gh pr create --draft --assignee @me \
     --title "<issue title>" --body-file <file>
   ```

   The pull request title is the issue title. The body follows
   `.github/pull_request_template.md`, starting with `Closes #N`.

3. Do exactly the Scope. Touch only the files the issue lists.
4. Before every commit, run the gate, and commit only if it passes:

   ```sh
   npm run gate && git commit -m "<message>"
   ```

5. Fill the Acceptance criteria section of the pull request body: copy
   every criterion from the issue, tick it, and put the evidence beside
   it. Evidence is a command with the last lines of its output, a file
   path, or a link to a CI run.
6. Mark the pull request ready with `gh pr ready`. That finishes the
   issue.

Do not merge. Do not close milestones, edit issue bodies, or change any
label except `blocked`. Do not push to `main`. Commits are signed by
your git configuration; never pass `--no-gpg-sign`.

## When the reviewer answers

Both agents use the same GitHub account, so the reviewer cannot approve
on GitHub. The verdict is a comment that starts with one of:

- `REVIEW: APPROVED`: the reviewer merges. Nothing is left for you.
- `REVIEW: CHANGES REQUESTED (round N of 2)`: a numbered list of failed
  criteria or broken hard constraints.

Fix exactly the listed items and nothing else. Push, then comment
`ADDRESSED: round N` with one line per item. Anything the reviewer
noticed outside the criteria becomes a new issue; it is never part of
your pull request.

## When you are stuck

If the issue is ambiguous, contradicts this file, or a gate fails for a
reason outside your scope:

1. Comment on the issue: what you tried, the exact error, and one
   question with the options you see.
2. Add the `blocked` label to the issue.
3. Leave the issue there. Do not guess, and do not widen the scope.

## Hard constraints

Breaking one of these fails review, whatever the issue says.

- Markdown passes `markdownlint` default rules. There is no
  configuration file and no inline disable comment; rewrite the text
  instead. Lines stay within 80 characters, code blocks and tables
  included. The one exception is the default rule's own: a line may
  run longer only where nothing after column 80 contains a space,
  such as a long URL.
- Every tracked file is in English.
- Skill content under `plugins/` never cites: no book titles, author
  names, publishers, chapter numbers, editions, or years in
  parentheses. Pattern names such as Strategy or Repository are common
  vocabulary and allowed. Every description, grouping, table and
  example is written fresh, in this pack's own words.
- Do not open `OOP_SOURCES.md` or `PRIVATE-NOTES.md`. They are the
  owner's local notes and are never tracked; CI fails if they are.
- Skill content never names another skill pack or repository.
- Every skill name starts with `oo-`, and its directory has the same
  name.
- Frontmatter keys are only `name`, `description`, `license` and
  `metadata`. `metadata` holds exactly `version` and `pack`, and `pack`
  is `object-oriented-design-skills`.
- Dependencies are pinned to exact versions; `.npmrc` sets
  `save-exact`.
- The version lives in `package.json`. Never change a version by
  find-and-replace. From v0.3.0, use `scripts/bump-version.mjs`.
- No `package.json` anywhere under `plugins/`.
- A check goes in red first. When you add or extend a check, show it
  failing on wrong input before it passes: a unit test, or a failed CI
  run linked from the pull request.
- A check that counted zero things has failed, not passed.
- Every framework or library API name in skill content is checked
  against its current official documentation. List the pages you
  checked in the pull request body, never in the files.
- Examples use one domain: a clinic, with patients, clinicians,
  appointments and slots.

## Code standard: object-oriented, without exception

This pack teaches object-oriented design, and its own tools are written
that way. A script that reads as a module of free functions fails
review even when it works.

- Every file in `scripts/lib/` is an ES module that exports classes. One
  main class per file, and the file name is the class name in
  kebab-case: `markdown-document.mjs` exports `MarkdownDocument`. The
  error hierarchy may share one file, `errors.mjs`.
- No top-level `function`, `let`, `var` or `const`. The top level holds
  only `import` declarations and classes. A constant is a `static`
  field of the class that owns it.
- An entry script in `scripts/` holds imports and one guarded
  composition root, so importing it never runs it:

  ```js
  import { Cli } from './lib/cli.mjs'
  import { Repository } from './lib/repository.mjs'
  import { RulesCheck } from './lib/checks/rules-check.mjs'

  if (import.meta.main) {
    await new Cli(process).run(
      new RulesCheck(Repository.at(process.cwd())))
  }
  ```

- State is private (`#field`). Collaborators arrive through the
  constructor. A class may build value objects, and the objects it
  owns or reads into being (a `Repository` builds its `Marketplace`;
  a `Cli` builds the `Report` for one run). It never builds a
  collaborator it could be given.
- Value objects are immutable (`Object.freeze(this)` at the end of the
  constructor) and compare by value.
- Behaviour varies by polymorphism: a new check is a new subclass of
  `Check`, never a new branch in a `switch` on a kind string.
- Failure is a thrown subclass of `RepoError`. Only `Cli` turns an
  exception into an exit code: 0 passed, 1 a check failed, 2 the tool
  itself broke.
- No other paradigm as the architecture: no Result or Either values, no
  `pipe` or `compose`, no modules of exported functions, no currying.
  `map` and `filter` inside a method are fine.
- Tests use `node:test` and live in `test/`, mirroring `scripts/lib/`.
  Test files may call `describe()` and `test()` at the top level; that
  is how the runner works.
- `scripts/validate-oop.mjs` enforces the first three rules, from
  v0.2.0.

You may read `../functional-design-skills/scripts` to learn what a
check does. Never copy its structure: it is written in the opposite
paradigm.

## Skill house style

Every core skill's `SKILL.md` has this shape, in this order:

```markdown
---
name: oo-<skill-name>
description: Use when <situations, in the words users say>.
license: MIT
metadata:
  version: <the version in package.json>
  pack: object-oriented-design-skills
---

# <Title Case Name>

**In this pack:**
[sizing](../oo-design/SKILL.md#how-much-design-a-task-warrants),
[notation](../oo-design/references/notation.md),
[rule strictness](../oo-design/SKILL.md#how-strictly-a-rule-is-meant).

## Overview
## When to use
## When not to use
## Core rules
## Pattern
## Red flags
## Common mistakes
## Related skills
## Further reading
```

- `description` opens with `Use when`, names the situations that should
  trigger the skill rather than what it covers, stays within 160
  characters, and claims no situation another skill claims.
- `## When not to use` lists at least two conditions an agent can
  observe in the code or the request. A warning is not a condition.
- `## Core rules` is a numbered list. Each item opens with `Rule.`,
  `Default.` or `Judgement.` and then a bold statement. The index
  defines the three labels. A `Default` states its exception as a
  sentence of its own that starts with "The exception".
- `## Pattern` uses the neutral notation, in `text` fences. Real syntax
  belongs only in language packs.
- Every code fence in every file of a skill is traced before commit:
  it uses only keywords `notation.md` defines, every field is set
  before it is read, no side effect happens twice, and the skill's
  files agree with each other.
  A class that a fence shares by name with `notation.md` or a shipped
  skill has the same fields and constructor there, or one sentence beside
  the fence says how this example differs.
- `## Red flags` are places to look, not verdicts. A red flag becomes a
  finding only with evidence: a measurement, a reproducible bug, or a
  failing test.
- `## Related skills` links sibling skills that exist, as
  `../oo-<name>/SKILL.md`. A skill in a language plugin names a core
  skill in backticks and never links it by path, because plugins
  install to different directories.
- `## Further reading` links every file in the skill's `references/`.
  References are one level deep. A reference over 100 lines with three
  or more sections starts with a contents list.
- `SKILL.md` stays under about 500 lines.

The index skill `oo-design` has its own shape, given in its issue.

## Commands

```sh
mise install                # Node, from .node-version
npm ci                      # exact versions, from package-lock.json
npm run gate                # everything CI runs; pass it before a commit
claude plugin validate .    # checks the manifests; local, no model call
```

## Files you must not create

- Any `.markdownlint*` configuration file.
- Any `package.json` under `plugins/`.
- `CHANGELOG.md`. GitHub Releases are the changelog.
- Any file the issue's Files section does not list.
