# Evals

Two eval files, two different checks. Neither proves that an agent
routes correctly.

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

`routing-cases.md` holds 13 routing cases.

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

`scenarios.md` holds 3 scenarios.

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
