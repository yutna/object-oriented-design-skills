import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { EvalPluginCheck } from '../../../scripts/lib/checks/eval-plugin-check.mjs'
import { RepoError } from '../../../scripts/lib/errors.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class FakeRepository {
  #root

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get root() {
    return this.#root
  }
}

class FakeRunner {
  run() {
    throw new Error('a refusal must not run a process')
  }
}

class TempCheck {
  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-eval-plugin-check-'))
    return new TempCheck(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  inspect(argv) {
    const report = new Report()
    new EvalPluginCheck(
      new FakeRepository(this.#root),
      argv,
      new FakeRunner()).inspect(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class Required {
  static model() {
    return {
      flag: '--model',
      argv: [
        '--dry-run',
        '--judge-model', 'claude-haiku-5-5',
        '--max-cost-usd', '2'
      ]
    }
  }

  static judgeModel() {
    return {
      flag: '--judge-model',
      argv: [
        '--dry-run',
        '--model', 'claude-sonnet-5-5',
        '--max-cost-usd', '2'
      ]
    }
  }

  static maxCostUsd() {
    return {
      flag: '--max-cost-usd',
      argv: [
        '--dry-run',
        '--model', 'claude-sonnet-5-5',
        '--judge-model', 'claude-haiku-5-5'
      ]
    }
  }
}

test('the script refuses to start without --model', async () => {
  const fixture = await TempCheck.create()
  try {
    const { flag, argv } = Required.model()
    assert.throws(
      () => fixture.inspect(argv),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message.includes(`${flag} is required`))
  } finally {
    await fixture.close()
  }
})

test('the script refuses to start without --judge-model', async () => {
  const fixture = await TempCheck.create()
  try {
    const { flag, argv } = Required.judgeModel()
    assert.throws(
      () => fixture.inspect(argv),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message.includes(`${flag} is required`))
  } finally {
    await fixture.close()
  }
})

test('the script refuses to start without --max-cost-usd', async () => {
  const fixture = await TempCheck.create()
  try {
    const { flag, argv } = Required.maxCostUsd()
    assert.throws(
      () => fixture.inspect(argv),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message.includes(`${flag} is required`))
  } finally {
    await fixture.close()
  }
})
