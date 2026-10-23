import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { EvalSummary } from '../../../scripts/lib/evals/eval-summary.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class Fixture {
  static ROOT = join(process.cwd(), 'test', 'fixtures', 'eval-summary')

  static QUESTION = 'q01-the-slot-rule-keeps-moving'

  static TASK = 't01-check-before-booking'

  static RESTRAINT = 'r01-overnight-duration'

  static summary() {
    return new EvalSummary(Fixture.ROOT).summary()
  }

  static report() {
    const report = new Report()
    new EvalSummary(Fixture.ROOT).inspect(report)
    return report
  }
}

class EmptyPiece {
  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-eval-summary-'))
    const piece = join(root, 'piece')
    await mkdir(piece, { recursive: true })
    await writeFile(join(piece, 'run.json'), `${JSON.stringify({
      arm: 'block',
      model: 'claude-sonnet-5-5'
    })}\n`)
    await writeFile(join(piece, 'result.json'), `${JSON.stringify({
      schemaVersion: 1,
      cases: [{
        name: 'q01-the-slot-rule-keeps-moving',
        arms: {
          with: [{
            passed: false,
            error: 'the account reached its session limit',
            graders: []
          }]
        }
      }]
    })}\n`)
    return new EmptyPiece(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  inspect() {
    const report = new Report()
    new EvalSummary(this.#root).inspect(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('each case and arm counts graded, errored and unjudged runs', () => {
  const summary = Fixture.summary()
  const question = summary.cases[Fixture.QUESTION].arms.block
  assert.equal(question.graded, 2)
  assert.equal(question.passed, 1)
  assert.equal(question.errored, 1)
  assert.equal(question.unjudged, 1)
  assert.deepEqual(question.failedGraders, ['substance'])
  assert.equal(summary.cases[Fixture.TASK].arms.block.passed, 0)
  assert.equal(summary.cases[Fixture.RESTRAINT].arms.block.passed, 1)
})

test('each case records the skills its runs really opened', () => {
  const question = Fixture.summary().cases[Fixture.QUESTION].arms.block
  assert.deepEqual(
    question.skillsLoaded, ['oo-assigning-responsibilities'])
  assert.deepEqual(question.skillFilesRead, ['oo-design'])
})

test('each family gives a pass rate per arm', () => {
  const families = Fixture.summary().families
  assert.deepEqual(families.question.block, {
    graded: 2, passed: 1, rate: 0.5
  })
  assert.deepEqual(families.task.block, {
    graded: 1, passed: 0, rate: 0
  })
  assert.deepEqual(families.restraint.none, {
    graded: 1, passed: 0, rate: 0
  })
  assert.deepEqual(families.precedence.none, {
    graded: 1, passed: 1, rate: 1
  })
})

test('cases won and lost against the stored baselines are named', () => {
  const summary = Fixture.summary()
  assert.deepEqual(summary.wins.block, [Fixture.RESTRAINT])
  assert.deepEqual(summary.losses.block, [Fixture.TASK])
  assert.deepEqual(summary.wins.baseline ?? [], [])
  const lines = Fixture.report().lines()
  assert.ok(lines.some((line) =>
    line.includes(Fixture.TASK) &&
    line.includes('rerun before changing anything')))
})

test('the run prints a table and writes summary.json', () => {
  const report = Fixture.report()
  assert.equal(report.lines().at(-1), 'ok 10 graded run(s)')
  assert.equal(existsSync(join(Fixture.ROOT, 'summary.json')), true)
  const summary = JSON.parse(
    readFileSync(join(Fixture.ROOT, 'summary.json'), 'utf8'))
  assert.equal(summary.gradedRuns, 10)
  assert.equal(summary.cases[Fixture.QUESTION].family, 'question')
})

test('a piece with no graded run fails', async () => {
  const piece = await EmptyPiece.create()
  try {
    const report = piece.inspect()
    assert.equal(report.failed, true)
    assert.equal(report.lines().some((line) => line.startsWith('ok ')), false)
  } finally {
    await piece.close()
  }
})
