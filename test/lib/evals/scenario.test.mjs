import test from 'node:test'
import assert from 'node:assert/strict'

import { Scenario } from '../../../scripts/lib/evals/scenario.mjs'

test('Scenario is a frozen value and compares by value', () => {
  const scenario = new Scenario(1, 'A slot rule', 'prompt', 'substance', [
    'oo-design',
    'oo-assigning-responsibilities'
  ])
  assert.equal(Object.isFrozen(scenario), true)
  assert.equal(Object.isFrozen(scenario.skills), true)
  assert.equal(scenario.equals(new Scenario(
    1, 'A slot rule', 'prompt', 'substance', [
      'oo-design',
      'oo-assigning-responsibilities'
    ])), true)
  assert.equal(scenario.equals(new Scenario(
    2, 'A slot rule', 'prompt', 'substance', [
      'oo-design',
      'oo-assigning-responsibilities'
    ])), false)
  assert.equal(scenario.equals({ number: 1 }), false)
})
