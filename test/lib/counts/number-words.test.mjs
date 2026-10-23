import test from 'node:test'
import assert from 'node:assert/strict'

import { NumberWords } from '../../../scripts/lib/counts/number-words.mjs'

test('NumberWords converts both ways including twenty-one', () => {
  assert.equal(NumberWords.toNumber('3'), 3)
  assert.equal(NumberWords.toNumber('three'), 3)
  assert.equal(NumberWords.toNumber('twenty-one'), 21)
  assert.equal(NumberWords.toWords(3), 'three')
  assert.equal(NumberWords.toWords(21), 'twenty-one')
  for (let number = 0; number <= 99; number += 1) {
    assert.equal(NumberWords.toNumber(String(number)), number)
    assert.equal(
      NumberWords.toNumber(NumberWords.toWords(number)),
      number)
  }
})
