# Evals

Two eval files, two different checks. Neither proves that an agent
routes correctly.

## Tiers

**Tier 0, static.** This tier runs `npm run gate`: the Markdown lint,
the skill and rules validators, the keyword routing check, the case
format check and the coverage check. It reads files and calls no model.
It measures whether the cases and pack obey their own rules, not whether
an agent routes or answers well. A clean run proves only that the
repository is consistent; it does not prove that any case measures the
right thing. It spends no quota, and every pull request passes it.

**Tier 1, one model call per case.** This tier runs
`node scripts/eval-route-model.mjs` through the queue, with
`--dry-run` to print the calls without making them. It shows the
listing exactly as an agent sees it and asks a small model for one
skill name per routing case. It measures top-1 routing against the
expected skill and prints each miss with the answer it gave. To rerun
one case ten times, `--case "<text>"` keeps the cases whose symptom
contains the text; queue it with
`node scripts/eval-queue.mjs --add "one routing case" --
scripts/eval-route-model.mjs --case "<text>" --runs 10`. A clean run
does not prove that the skill text helps, that a real session would
choose the same skill, or that one run would repeat. Measured on Claude
Pro with Haiku 5.5: about 0.0015 USD per case; 11 cases three times
moved the five-hour window under 1 point.

**Tier 2, the quality of what changed.** This tier runs the plugin-eval
pieces for the skills a milestone added or changed, three runs per case,
with the block against a stored no-pack baseline. Queue the pieces with
`node scripts/eval-plugin.mjs --queue`, then let the queue run them.
`node scripts/eval-summary.mjs <results dir>` reads each piece as cases
won and lost, names the failed graders, and lists the skills each run
opened. A clean run does not prove general quality: three runs are a
sample, the judge can be wrong, and a case can swing with no change.
Measured on Claude Pro with Sonnet 5.5 as agent and Haiku 5.5 as judge,
one run: a question case costs about 0.067 USD and a task case about
0.037 USD (a refused edit; a real edit costs more); one piece moved the
five-hour window about 1 point and the seven-day window under 1 point;
a blocked batch waits for quota and does not hold a milestone open.

**Tier 3, the release sweep.** This tier runs every case in both arms,
three runs each, with baselines reused when the agent model is
unchanged. Queue a baseline sweep with `--arm baseline` first, then the
block sweep with `--arm block`; summarise the timestamp folder with
`node scripts/eval-summary.mjs evals/results/<stamp>`. Read every losing
case before changing anything, and rerun it in the next window. A clean
run does not prove that the release is stable across models or that a
loss has one cause. About 70 cases in two arms, three runs each, is about 420
runs: about 20 to 30 USD at list price, or 20% to 30% of a week's
quota, in sittings over several five-hour windows.

### Queue rules

- The reviewer runs every model tier. The implementer builds cases and
  code, and never spends quota.
- `node scripts/eval-queue.mjs --run` takes the oldest entry, and
  `--dry-run` previews it. A piece that needs a model refuses to start
  outside the queue. The `--five-hour-start <n>`,
  `--five-hour-continue <n>`, `--seven-day-start <n>` and
  `--seven-day-continue <n>` options set the two five-hour and two
  seven-day lines for one sitting (whole percentages from 1 to 100; the
  start below the continue when both of a pair are given), and without
  them the defaults above stand.
- A new piece starts only when the five-hour window is under 50% used
  and the seven-day window is under 75% used.
- A batch stops before its next piece when the five-hour window reaches
  70% or the seven-day window reaches 85%. The queue prints a `WAIT:`
  line with both readings and the reset time, and leaves the piece at
  the front.
- A pause line prints `PAUSE:` and stops the run. The first piece of a
  plugin-eval batch is followed by `read the traces of piece 1 before
  more runs`.
- `evals/results/queue.json` is the backlog. The oldest entry runs
  first, and a batch the meter blocks keeps its place until the next
  sitting. No release or review waits for it.

## Routing cases

`routing-cases.md` is a keyword check on the skill names and
descriptions that an agent sees before it opens a skill.

Run it with:

```sh
npm run eval:routing
```

It scores each symptom against every skill, fails when an expected skill
is missing, scores zero, or ranks outside the allowed top, and prints
the first-place count. `--noise` also prints skills that reach the top
three for cases they do not own.

`routing-cases.md` holds 106 routing cases.

What it proves: the descriptions contain the words people use for the
problems the skills own. What it does not prove: that an agent chooses
the right skill. A bag of words can pass while describing the wrong
thing.

## Scenarios

`scenarios.md` holds fuller problems for a real session. Paste one
scenario as the whole prompt into an agent session with the pack
installed and read which skill it opens. They are spot checks, not
regression tests.

The format check runs with the same command:

```sh
npm run eval:routing
```

It checks the numbering, the prompt, the Must contain paragraph and
the Should reach skill, and it checks that every named skill exists.
It does not run a model.

`scenarios.md` holds 36 scenarios.

What it proves: the file's structure is complete enough to run. What it
does not prove: that an answer will be good. Scenario results move with
the model and the session, so no score is recorded as if stable.

## Task cases

`tasks/` carries cases that ask an agent to change a small clinic
project. Each starts from `fixture-tasks/`, a dependency-free
TypeScript project with a slot-booking handler, an invoice and an
appointment that crosses midnight. They cover the task, restraint and
precedence families.

`tasks/` holds 3 task cases.
