import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { test } from 'node:test'

import { EmptyTreeRun } from '../../../scripts/lib/negative/empty-tree-run.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class FakeRunner {
  #results
  #calls = []

  constructor(results) {
    this.#results = results
  }

  run(command, args, cwd) {
    this.#calls.push({
      command,
      args,
      cwd,
      entries: readdirSync(cwd)
    })
    return this.#results[this.#calls.length - 1] ??
      this.#results.at(-1)
  }

  get calls() {
    return this.#calls
  }
}

test('EmptyTreeRun records an error for exit 0', () => {
  const runner = new FakeRunner([
    { exitCode: 0, output: 'ok' },
    { exitCode: 0, output: 'ok' },
    { exitCode: 0, output: 'ok' },
    { exitCode: 0, output: 'ok' },
    { exitCode: 0, output: 'ok' },
    { exitCode: 0, output: 'ok' },
    { exitCode: 0, output: 'ok' }
  ])
  const report = new Report()
  new EmptyTreeRun(process.cwd(), runner).inspect(report)

  assert.equal(report.failed, true)
  assert.equal(runner.calls.length, 7)
  assert.ok(report.lines().some((line) =>
    line.includes('expected exit 1')))
  for (const { cwd, entries } of runner.calls) {
    assert.equal(entries.length, 0)
    assert.equal(existsSync(cwd), false)
  }
})

test('EmptyTreeRun records an error for exit 1 without refusal', () => {
  const runner = new FakeRunner([
    { exitCode: 1, output: 'stack trace only' },
    { exitCode: 1, output: 'stack trace only' },
    { exitCode: 1, output: 'stack trace only' },
    { exitCode: 1, output: 'stack trace only' },
    { exitCode: 1, output: 'stack trace only' },
    { exitCode: 1, output: 'stack trace only' },
    { exitCode: 1, output: 'stack trace only' }
  ])
  const report = new Report()
  new EmptyTreeRun(process.cwd(), runner).inspect(report)

  assert.equal(report.failed, true)
  assert.equal(runner.calls.length, 7)
  assert.ok(report.lines().some((line) =>
    line.includes('expected exit 1')))
  for (const { cwd, entries } of runner.calls) {
    assert.equal(entries.length, 0)
    assert.equal(existsSync(cwd), false)
  }
})

test('EmptyTreeRun accepts exit 1 with a refusal', () => {
  const runner = new FakeRunner([
    { exitCode: 1, output: 'measured nothing' },
    { exitCode: 1, output: 'error: no marketplace' },
    { exitCode: 1, output: 'error: no marketplace' },
    { exitCode: 1, output: 'error: no marketplace' },
    { exitCode: 1, output: 'error: no marketplace' },
    { exitCode: 1, output: 'error: no marketplace' },
    { exitCode: 1, output: 'error: no marketplace' }
  ])
  const report = new Report()
  new EmptyTreeRun(process.cwd(), runner).inspect(report)

  assert.equal(report.failed, false)
  assert.equal(runner.calls.length, 7)
  assert.ok(report.lines().some((line) =>
    line.includes('ok scripts/validate-oop.mjs refuses an empty tree')))
  assert.ok(report.lines().some((line) =>
    line.includes('ok scripts/validate-prose.mjs refuses an empty tree')))
  assert.ok(report.lines().some((line) =>
    line.includes('ok scripts/validate-patterns.mjs refuses an empty tree')))
  assert.ok(report.lines().some((line) =>
    line.includes('ok scripts/validate-counts.mjs refuses an empty tree')))
  assert.ok(report.lines().some((line) =>
    line.includes('ok scripts/eval-routing.mjs refuses an empty tree')))
  for (const { cwd, entries } of runner.calls) {
    assert.equal(entries.length, 0)
    assert.equal(existsSync(cwd), false)
  }
})
