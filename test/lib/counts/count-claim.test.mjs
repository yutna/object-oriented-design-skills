import test from 'node:test'
import assert from 'node:assert/strict'

import { CountClaim } from '../../../scripts/lib/counts/count-claim.mjs'
import { RoutingCaseCount } from '../../../scripts/lib/counts/routing-case-count.mjs'
import { ScenarioCount } from '../../../scripts/lib/counts/scenario-count.mjs'

test('CountClaim is a frozen value and compares by value', () => {
  const claim = new CountClaim(
    'evals/README.md',
    /holds (\S+) routing cases/,
    new RoutingCaseCount())
  const same = new CountClaim(
    'evals/README.md',
    /holds (\S+) routing cases/,
    new RoutingCaseCount())
  const different = new CountClaim(
    'evals/README.md',
    /holds (\S+) scenarios/,
    new ScenarioCount())
  assert.equal(Object.isFrozen(claim), true)
  assert.equal(claim.equals(same), true)
  assert.equal(claim.equals(different), false)
  assert.equal(claim.equals({ path: 'evals/README.md' }), false)
})
