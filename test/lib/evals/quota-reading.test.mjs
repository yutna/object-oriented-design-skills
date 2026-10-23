import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { QuotaReading } from '../../../scripts/lib/evals/quota-reading.mjs'

class Fixture {
  static stream() {
    return readFileSync(
      new URL('../../fixtures/rate-limit-event.jsonl', import.meta.url),
      'utf8')
  }
}

class ReadingAt {
  static of(fiveHour = 10, sevenDay = 20) {
    return new QuotaReading(
      fiveHour,
      sevenDay,
      1792783200,
      1793127600)
  }
}

test('QuotaReading reads the real rate limit sample as whole percents',
  () => {
    const reading = QuotaReading.fromStreamJson(Fixture.stream())
    assert.equal(reading.fiveHour, 3)
    assert.equal(reading.sevenDay, 48)
    assert.equal(reading.fiveHourResetsAt, 1792783200)
    assert.equal(reading.sevenDayResetsAt, 1793127600)
    assert.equal(Object.isFrozen(reading), true)
  })

test('QuotaReading takes the last rate limit event', () => {
  const later = JSON.stringify({
    type: 'rate_limit_event',
    rate_limit_info: {
      unifiedWindows: {
        five_hour: { utilization: 0.99, resetsAt: 1 },
        seven_day: { utilization: 0.88, resetsAt: 2 }
      }
    }
  })
  const reading = QuotaReading.fromStreamJson(
    `${Fixture.stream()}${later}\n`)
  assert.equal(reading.fiveHour, 99)
  assert.equal(reading.sevenDay, 88)
  assert.equal(reading.fiveHourResetsAt, 1)
  assert.equal(reading.sevenDayResetsAt, 2)
})

test('QuotaReading ignores lines that are not rate limit events', () => {
  const text = '{"type":"system"}\n\n' + Fixture.stream()
  const reading = QuotaReading.fromStreamJson(text)
  assert.equal(reading.fiveHour, 3)
})

test('QuotaReading throws a RepoError when no event is present', () => {
  assert.throws(
    () => QuotaReading.fromStreamJson('{"type":"result"}\n'),
    (error) => error instanceof RepoError &&
      /no rate_limit_event/.test(error.message))
})

test('QuotaReading compares by value', () => {
  const reading = ReadingAt.of()
  assert.equal(reading.equals(ReadingAt.of()), true)
  assert.equal(reading.equals(ReadingAt.of(11)), false)
  assert.equal(reading.equals(ReadingAt.of(10, 21)), false)
  assert.equal(reading.equals({ fiveHour: 10 }), false)
})
