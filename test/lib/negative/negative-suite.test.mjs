import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync,
  writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { CreateFile } from '../../../scripts/lib/negative/create-file.mjs'
import { NegativeCase } from '../../../scripts/lib/negative/negative-case.mjs'
import { NegativeSuite } from '../../../scripts/lib/negative/negative-suite.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class TempRepository {
  static create() {
    const root = mkdtempSync(join(tmpdir(), 'oo-negative-suite-'))
    mkdirSync(join(root, 'scripts'), { recursive: true })
    writeFileSync(
      join(root, 'scripts', 'validate-skills.mjs'),
      '// fixture\n')
    execFileSync('git', ['init', '--quiet'], { cwd: root })
    execFileSync('git', ['add', '.'], { cwd: root })
    return new TempRepository(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  close() {
    rmSync(this.#root, { recursive: true, force: true })
  }
}

class FakeRunner {
  #results
  #calls = []

  constructor(results) {
    this.#results = results
  }

  run(command, args, cwd) {
    this.#calls.push({ command, args, cwd })
    return this.#results[this.#calls.length - 1] ??
      this.#results.at(-1)
  }

  get calls() {
    return this.#calls
  }
}

function caseFor(label = 'a case') {
  return new NegativeCase(
    label,
    'scripts/validate-skills.mjs',
    new CreateFile('made.txt', 'made\n'),
    'expected text')
}

test('NegativeSuite records an error when the control run fails', () => {
  const repository = TempRepository.create()
  try {
    const runner = new FakeRunner([
      { exitCode: 1, output: 'broken control' }
    ])
    const report = new Report()
    new NegativeSuite(repository.root, [caseFor()], runner)
      .inspect(report)

    assert.equal(report.failed, true)
    assert.equal(runner.calls.length, 1)
    assert.ok(report.lines().some((line) =>
      line.includes('control exited 1')))
    for (const { cwd } of runner.calls) {
      assert.equal(existsSync(cwd), false)
    }
  } finally {
    repository.close()
  }
})

test('NegativeSuite records an error when a case exits 0', () => {
  const repository = TempRepository.create()
  try {
    const runner = new FakeRunner([
      { exitCode: 0, output: '' },
      { exitCode: 0, output: '' }
    ])
    const report = new Report()
    new NegativeSuite(repository.root, [caseFor()], runner)
      .inspect(report)

    assert.equal(report.failed, true)
    assert.equal(runner.calls.length, 2)
    assert.ok(report.lines().some((line) =>
      line.includes('error a case:')))
    for (const { cwd } of runner.calls) {
      assert.equal(existsSync(cwd), false)
    }
  } finally {
    repository.close()
  }
})
