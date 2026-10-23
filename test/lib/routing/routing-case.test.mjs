import test from 'node:test'
import assert from 'node:assert/strict'

import { RoutingCase } from '../../../scripts/lib/routing/routing-case.mjs'

test('RoutingCase is a frozen value and compares by value', () => {
  const first = new RoutingCase('a clinic visit', 'oo-design')
  const same = new RoutingCase('a clinic visit', 'oo-design')
  const other = new RoutingCase(
    'a clinic visit',
    'oo-assigning-responsibilities')
  assert.equal(first.symptom, 'a clinic visit')
  assert.equal(first.expected, 'oo-design')
  assert.equal(Object.isFrozen(first), true)
  assert.equal(first.equals(same), true)
  assert.equal(first.equals(other), false)
})
