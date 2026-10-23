import test from 'node:test'
import assert from 'node:assert/strict'

import { Check } from '../../scripts/lib/check.mjs'
import { Report } from '../../scripts/lib/report.mjs'

class RecordingCheck extends Check {
  #seen

  get name() {
    return 'recording'
  }

  inspect(report) {
    this.#seen = report
  }

  get seen() {
    return this.#seen
  }
}

test('Check.name throws when a subclass does not override it', () => {
  const check = new Check()
  assert.throws(() => check.name, /Check\.name must be overridden/)
})

test('Check.inspect throws when a subclass does not override it', () => {
  const check = new Check()
  assert.throws(
    () => check.inspect(new Report()),
    /Check\.inspect must be overridden/)
})

test('Check.run calls inspect with the report', () => {
  const check = new RecordingCheck()
  const report = new Report()
  check.run(report)
  assert.equal(check.seen, report)
})
