import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Check } from '../../scripts/lib/check.mjs'
import { Cli } from '../../scripts/lib/cli.mjs'
import { RepoError } from '../../scripts/lib/errors.mjs'

class FakeProcess {
  constructor() {
    this.argv = []
    this.exitCode = undefined
    this.stdoutChunks = []
    this.stderrChunks = []
    this.stdout = {
      write: (chunk) => {
        this.stdoutChunks.push(chunk)
      }
    }
    this.stderr = {
      write: (chunk) => {
        this.stderrChunks.push(chunk)
      }
    }
  }
}

class PassingCheck extends Check {
  get name() {
    return 'passing'
  }

  inspect(report) {
    report.count('file(s)', 1)
  }
}

class FailingCheck extends Check {
  get name() {
    return 'failing'
  }

  inspect(report) {
    report.error('fixture', 'bad')
  }
}

class RepoErrorCheck extends Check {
  get name() {
    return 'repo-error'
  }

  inspect() {
    throw new RepoError('broken')
  }
}

class CrashCheck extends Check {
  get name() {
    return 'crash'
  }

  inspect() {
    throw new Error('boom')
  }
}

test('Cli writes a passing report and sets exit code 0', async () => {
  const processLike = new FakeProcess()
  await new Cli(processLike).run(new PassingCheck())
  assert.equal(processLike.exitCode, 0)
  assert.deepEqual(processLike.stdoutChunks, ['ok 1 file(s)\n'])
  assert.deepEqual(processLike.stderrChunks, [])
})

test('Cli writes a failed report and sets exit code 1', async () => {
  const processLike = new FakeProcess()
  await new Cli(processLike).run(new FailingCheck())
  assert.equal(processLike.exitCode, 1)
  assert.deepEqual(
    processLike.stdoutChunks,
    ['error fixture: bad\nfailed: 1 error(s)\n'])
  assert.deepEqual(processLike.stderrChunks, [])
})

test('Cli writes a RepoError and sets exit code 1', async () => {
  const processLike = new FakeProcess()
  await new Cli(processLike).run(new RepoErrorCheck())
  assert.equal(processLike.exitCode, 1)
  assert.deepEqual(processLike.stdoutChunks, [])
  assert.deepEqual(processLike.stderrChunks, ['error: broken\n'])
})

test('Cli writes a stack and sets exit code 2 for another error', async () => {
  const processLike = new FakeProcess()
  await new Cli(processLike).run(new CrashCheck())
  assert.equal(processLike.exitCode, 2)
  assert.deepEqual(processLike.stdoutChunks, [])
  assert.equal(processLike.stderrChunks.length, 1)
  assert.match(processLike.stderrChunks[0], /^Error: boom\n/)
})

test('importing validate-oop.mjs does not run it', async () => {
  const before = process.exitCode
  await import('../../scripts/validate-oop.mjs')
  assert.equal(process.exitCode, before)

  const url = pathToFileURL(
    join(process.cwd(), 'scripts', 'validate-oop.mjs')).href
  const child = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', `await import(${JSON.stringify(url)})`],
    { cwd: process.cwd(), encoding: 'utf8' })
  assert.equal(child.status, 0)
  assert.equal(child.signal, null)
  assert.equal(child.stdout, '')
  assert.equal(child.stderr, '')
})
