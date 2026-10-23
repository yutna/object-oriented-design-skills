import test from 'node:test'
import assert from 'node:assert/strict'

import { Check } from '../../../scripts/lib/check.mjs'
import { CheckSuite } from '../../../scripts/lib/checks/check-suite.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class RecordingCheck extends Check {
  #label
  #log

  constructor(label, log) {
    super()
    this.#label = label
    this.#log = log
  }

  get name() {
    return this.#label
  }

  run(report) {
    this.#log.push({ label: this.#label, report })
    return super.run(report)
  }

  inspect(report) {
    report.count('check(s)', 1)
  }
}

test('CheckSuite runs every check in order on the same report', async () => {
  const log = []
  const suite = new CheckSuite('validate-skills', [
    new RecordingCheck('first', log),
    new RecordingCheck('second', log)
  ])
  const report = new Report()

  await suite.run(report)

  assert.equal(suite.name, 'validate-skills')
  assert.deepEqual(
    log.map(({ label }) => label),
    ['first', 'second'])
  assert.ok(log.every(({ report: seen }) => seen === report))
  assert.equal(report.failed, false)
})
