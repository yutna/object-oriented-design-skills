import { CountClaim } from './count-claim.mjs'
import { ListItemsUnder } from './list-items-under.mjs'
import { RoutingCaseCount } from './routing-case-count.mjs'
import { ScenarioCount } from './scenario-count.mjs'

export class CountClaims {
  // The index and the evals README state numbers about the pack itself.
  static ALL = Object.freeze([
    new CountClaim(
      'plugins/core/skills/oo-design/SKILL.md',
      /carries one of (\S+) labels/,
      new ListItemsUnder(
        'plugins/core/skills/oo-design/SKILL.md',
        'How strictly a rule is meant')),
    new CountClaim(
      'evals/README.md',
      /holds (\S+) routing cases/,
      new RoutingCaseCount()),
    new CountClaim(
      'evals/README.md',
      /holds (\S+) scenarios/,
      new ScenarioCount())
  ])
}
