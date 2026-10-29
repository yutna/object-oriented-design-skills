import test from 'node:test'
import assert from 'node:assert/strict'

import { PatternName } from '../../../scripts/lib/checks/pattern-name.mjs'

test('PatternName names the plural of a pattern', () => {
  assert.equal(
    new PatternName('Bulkhead').foundIn('Two bulkheads stand apart.'),
    true)
})

test('PatternName accepts a hyphen where the text has a space', () => {
  assert.equal(
    new PatternName('Model-view-controller')
      .foundIn('The model view controller split.'),
    true)
})

test('PatternName accepts ies for a name ending in y', () => {
  assert.equal(
    new PatternName('Factory').foundIn('Two factories build the slot.'),
    true)
})

test('PatternName ignores a word that only starts with the name', () => {
  assert.equal(
    new PatternName('State').foundIn('The statement holds.'),
    false)
})

test('PatternName reports the line of the first mention', () => {
  const text = 'No pattern here.\n\nA Retry answers.\nAnother retry answers.'
  assert.equal(new PatternName('Retry').lineIn(text), 3)
})

test('PatternName reports no line when the text does not name it', () => {
  assert.equal(new PatternName('Mediator').lineIn('Nothing here.'), null)
})

test('PatternName compares by name without case', () => {
  assert.equal(
    new PatternName('Message Bus').equals(new PatternName('message bus')),
    true)
  assert.equal(
    new PatternName('Message Bus').equals(new PatternName('Message Channel')),
    false)
})
