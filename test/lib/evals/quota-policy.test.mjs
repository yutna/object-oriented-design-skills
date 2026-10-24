import test from 'node:test'
import assert from 'node:assert/strict'

import { QuotaPolicy } from '../../../scripts/lib/evals/quota-policy.mjs'
import { QuotaReading } from '../../../scripts/lib/evals/quota-reading.mjs'

class ReadingAt {
  static of(fiveHour, sevenDay) {
    return new QuotaReading(fiveHour, sevenDay, 1, 2)
  }
}

test('QuotaPolicy.DEFAULT starts below 50 and 75', () => {
  assert.equal(Object.isFrozen(QuotaPolicy.DEFAULT), true)
  assert.equal(QuotaPolicy.DEFAULT.mayStart(ReadingAt.of(49, 74)), true)
  assert.equal(QuotaPolicy.DEFAULT.mayStart(ReadingAt.of(50, 74)), false)
  assert.equal(QuotaPolicy.DEFAULT.mayStart(ReadingAt.of(49, 75)), false)
  assert.equal(QuotaPolicy.DEFAULT.mayStart(ReadingAt.of(50, 75)), false)
})

test('QuotaPolicy.DEFAULT continues below 70 and 85', () => {
  assert.equal(QuotaPolicy.DEFAULT.mayContinue(ReadingAt.of(69, 84)), true)
  assert.equal(QuotaPolicy.DEFAULT.mayContinue(ReadingAt.of(70, 84)), false)
  assert.equal(QuotaPolicy.DEFAULT.mayContinue(ReadingAt.of(69, 85)), false)
  assert.equal(QuotaPolicy.DEFAULT.mayContinue(ReadingAt.of(70, 85)), false)
})

test('QuotaPolicy takes a seven-day start and continue', () => {
  const policy = new QuotaPolicy({
    sevenDayStart: 90,
    sevenDayContinue: 97
  })
  assert.equal(Object.isFrozen(policy), true)
  assert.equal(policy.mayStart(ReadingAt.of(10, 89)), true)
  assert.equal(policy.mayStart(ReadingAt.of(10, 90)), false)
  assert.equal(policy.mayContinue(ReadingAt.of(10, 96)), true)
  assert.equal(policy.mayContinue(ReadingAt.of(10, 97)), false)
})

test('QuotaPolicy keeps the other defaults beside one seven-day line', () => {
  const policy = new QuotaPolicy({ sevenDayStart: 90 })
  assert.equal(policy.mayStart(ReadingAt.of(49, 80)), true)
  assert.equal(policy.mayStart(ReadingAt.of(50, 80)), false)
  assert.equal(policy.mayStart(ReadingAt.of(49, 90)), false)
  assert.equal(policy.mayContinue(ReadingAt.of(69, 84)), true)
  assert.equal(policy.mayContinue(ReadingAt.of(70, 84)), false)
})
