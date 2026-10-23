import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NegativeCase } from '../../../scripts/lib/negative/negative-case.mjs'
import { ReplaceText } from '../../../scripts/lib/negative/replace-text.mjs'

test('NegativeCase compares by value and is frozen', () => {
  const left = new NegativeCase(
    'label',
    'script',
    new ReplaceText('a', 'b', 'c'),
    'expected')
  const right = new NegativeCase(
    'label',
    'script',
    new ReplaceText('a', 'b', 'c'),
    'expected')
  const other = new NegativeCase(
    'other',
    'script',
    new ReplaceText('a', 'b', 'c'),
    'expected')

  assert.equal(left.equals(right), true)
  assert.equal(left.equals(other), false)
  assert.equal(left.equals(null), false)
  assert.equal(left.label, 'label')
  assert.equal(left.script, 'script')
  assert.equal(left.expected, 'expected')
  assert.ok(left.mutation instanceof ReplaceText)
  assert.equal(Object.isFrozen(left), true)
})
