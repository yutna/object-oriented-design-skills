# object-oriented-design-skills

[![ci](https://github.com/yutna/object-oriented-design-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/yutna/object-oriented-design-skills/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/yutna/object-oriented-design-skills?sort=semver)](https://github.com/yutna/object-oriented-design-skills/releases/latest)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Agent Skills carrying design rules for codebases written in an
object-oriented style, for Claude Code. They are not universal advice:
a project's own written conventions win.

## Status

Pre-1.0 and growing. Each 0.x release adds skills. The index skill
lists only skills that exist.

## Installation

In Claude Code:

```text
/plugin marketplace add yutna/object-oriented-design-skills
/plugin install object-oriented-design-skills@object-oriented-design-skills
```

### From a checkout

From a checkout, copy the selected plugin's skills into
`~/.claude/skills`:

```sh
./scripts/install.sh
```

On Windows:

```powershell
./scripts/install.ps1
```

The scripts accept `--plugin <name>` (repeatable), `--all`, `--force`
and `--dry-run`. With no selection they use the core plugin. They copy
a skill when the name is free. They skip a skill this pack already
installed unless `--force` replaces it. They refuse a name that belongs
to another pack or claims no pack, and leave it alone. A copy prints
`copied`, a skip prints `skipped`, and a refusal prints an error.

The script also prints the `CLAUDE.md` block to paste into a project,
so an agent working there knows the pack is available.

## Listing budget

Claude Code lists every installed skill's name and description in
context on every turn, in a budget of 1% of the context window by
default. Past it, descriptions are dropped, starting with the skills
used least. A skill listed by name alone is rarely chosen.

Set `skillListingBudgetFraction` in a top-level `settings.json` to
change the fraction (greater than 0, at most 1):

```json
{"skillListingBudgetFraction": 0.02}
```

The pack keeps the core plugin's listing under a fixed ceiling. Use one
install route, not both: a plugin skill and a personal skill of the same
name both load.

## Development

Run `npm run gate`. See [AGENTS.md](AGENTS.md) and
[CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE)
