import test from 'node:test'
import assert from 'node:assert/strict'

import { RoutingIndex } from '../../../scripts/lib/routing/routing-index.mjs'

class ClinicSkill {
  #name
  #description

  constructor(name, description) {
    this.#name = name
    this.#description = description
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }

  get description() {
    return this.#description
  }
}

test('RoutingIndex ranks a match above a non-match and ties by name', () => {
  const index = new RoutingIndex([
    new ClinicSkill('oo-design', 'design a clinic workflow'),
    new ClinicSkill('oo-assigning-responsibilities', 'class own method')
  ])
  const matching = index.rank('design a clinic workflow')
  assert.deepEqual(
    matching.map(({ name }) => name),
    ['oo-design', 'oo-assigning-responsibilities'])
  assert.ok(matching[0].score > 0)
  assert.equal(matching[1].score, 0)

  const tied = index.rank('appointment slot')
  assert.deepEqual(
    tied.map(({ name }) => name),
    ['oo-assigning-responsibilities', 'oo-design'])
  assert.deepEqual(tied.map(({ score }) => score), [0, 0])
})

test('RoutingIndex counts the skill name twice', () => {
  const index = new RoutingIndex([
    new ClinicSkill('oo-design', ''),
    new ClinicSkill('oo-assigning-responsibilities', '')
  ])
  const [first] = index.rank('design')
  assert.equal(first.name, 'oo-design')
  assert.ok(Math.abs(
    first.score - (1 + Math.log(2)) * Math.log(2)) < 1e-12)
})
