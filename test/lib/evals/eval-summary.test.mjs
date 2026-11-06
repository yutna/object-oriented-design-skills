import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import {
  mkdir,
  mkdtemp,
  rm,
  utimes,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { EvalSummary } from '../../../scripts/lib/evals/eval-summary.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class Fixture {
  static ROOT = join(process.cwd(), 'test', 'fixtures', 'eval-summary')

  static HASH = '0123456789ab'

  static VERSION = '2.1.308'

  static QUESTION = 'q01-the-slot-rule-keeps-moving'

  static TASK = 't01-check-before-booking'

  static RESTRAINT = 'r01-overnight-duration'

  static summary() {
    const root = Fixture.#copy()
    try {
      return new EvalSummary(root).summary()
    } finally {
      Fixture.#remove(root)
    }
  }

  static report() {
    const root = Fixture.#copy()
    try {
      const report = new Report()
      new EvalSummary(root).inspect(report)
      return report
    } finally {
      Fixture.#remove(root)
    }
  }

  static inspected() {
    const root = Fixture.#copy()
    try {
      const report = new Report()
      const summary = new EvalSummary(root)
      summary.inspect(report)
      return Object.freeze({
        report,
        summary: summary.summary(),
        written: JSON.parse(
          readFileSync(join(root, 'summary.json'), 'utf8'))
      })
    } finally {
      Fixture.#remove(root)
    }
  }

  static #copy() {
    const root = mkdtempSync(
      join(tmpdir(), 'oo-eval-summary-fixture-'))
    cpSync(Fixture.ROOT, root, { recursive: true })
    const path = join(root, 'run-1', 'run.json')
    const record = JSON.parse(readFileSync(path, 'utf8'))
    record.baselineHashes = Object.fromEntries(
      record.cases.map((name) => [name, Fixture.HASH]))
    writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`)
    Fixture.#versionBaselines(root)
    return root
  }

  static #versionBaselines(root) {
    const directory = join(root, 'baselines', 'claude-sonnet-5-5')
    for (const file of readdirSync(directory)) {
      const path = join(directory, file)
      const runs = JSON.parse(readFileSync(path, 'utf8'))
      writeFileSync(path, `${JSON.stringify({
        claudeVersion: Fixture.VERSION,
        runs
      }, null, 2)}\n`)
    }
  }

  static #remove(root) {
    rmSync(root, { recursive: true, force: true })
  }
}

class SummaryFixture {
  static HASH = 'aaaaaaaaaaaa'

  static OTHER = 'bbbbbbbbbbbb'

  static MODEL = 'claude-sonnet-5-5'

  static VERSION = '2.1.311'

  static OLDER = '2.1.308'

  static QUESTION = 'q01-the-slot-rule-keeps-moving'

  static TASK = 't01-check-before-booking'

  static async create() {
    return new SummaryFixture(
      await mkdtemp(join(tmpdir(), 'oo-eval-summary-')))
  }

  #root

  constructor(root) {
    this.#root = root
  }

  async piece({
    name = 'piece',
    arm = 'block',
    hashes = null,
    claudeVersion = SummaryFixture.VERSION,
    cases
  }) {
    const directory = join(this.#root, name)
    await mkdir(directory, { recursive: true })
    const record = { arm, model: SummaryFixture.MODEL }
    if (hashes !== null) record.baselineHashes = hashes
    await writeFile(
      join(directory, 'run.json'),
      `${JSON.stringify(record, null, 2)}\n`)
    await writeFile(
      join(directory, 'result.json'),
      `${JSON.stringify({
        schemaVersion: 1,
        claudeVersion,
        cases
      }, null, 2)}\n`)
  }

  async baseline({
    name,
    hash,
    runs,
    mtime = null,
    claudeVersion = SummaryFixture.VERSION,
    versioned = false
  }) {
    const directory = join(
      this.#root, 'baselines', SummaryFixture.MODEL)
    await mkdir(directory, { recursive: true })
    const file = versioned
      ? `${name}-${hash}-${claudeVersion}.json`
      : `${name}-${hash}.json`
    const path = join(directory, file)
    const body = claudeVersion === null ? runs : { claudeVersion, runs }
    await writeFile(path, `${JSON.stringify(body, null, 2)}\n`)
    if (mtime !== null) {
      const date = new Date(mtime)
      await utimes(path, date, date)
    }
  }

  summary() {
    return new EvalSummary(this.#root).summary()
  }

  report() {
    const report = new Report()
    new EvalSummary(this.#root).inspect(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class CaseResult {
  static graded(passed) {
    return {
      passed,
      error: null,
      graders: [{
        name: 'substance',
        passed,
        judgeVotes: [passed],
        explanation: passed
          ? 'judge votes: PASS PASS PASS'
          : 'judge votes: FAIL FAIL FAIL'
      }]
    }
  }

  static row(name, arms) {
    return { name, arms }
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
  const { report, written } = Fixture.inspected()
  assert.equal(report.lines().at(-1), 'ok 10 graded run(s)')
  assert.equal(written.schemaVersion, 1)
  assert.equal(written.gradedRuns, 10)
  assert.equal(written.cases[Fixture.QUESTION].family, 'question')
})

test('a stored baseline with another hash is not used even when newest',
  async () => {
    const fixture = await SummaryFixture.create()
    const name = SummaryFixture.QUESTION
    try {
      await fixture.piece({
        hashes: { [name]: SummaryFixture.HASH },
        cases: [CaseResult.row(name, {
          with: [CaseResult.graded(true)]
        })]
      })
      await fixture.baseline({
        name,
        hash: SummaryFixture.OTHER,
        runs: [CaseResult.graded(false)],
        mtime: Date.now() + 60000
      })
      const summary = fixture.summary()
      assert.deepEqual(summary.wins.block, [])
      assert.deepEqual(summary.losses.block, [])
      assert.ok(fixture.report().lines().includes(
        `no baseline for this case text: ${name}`))
    } finally {
      await fixture.close()
    }
  })

test('a matching stored baseline decides wins and losses', async () => {
  const fixture = await SummaryFixture.create()
  const win = SummaryFixture.QUESTION
  const loss = SummaryFixture.TASK
  try {
    await fixture.piece({
      hashes: {
        [win]: SummaryFixture.HASH,
        [loss]: SummaryFixture.OTHER
      },
      cases: [
        CaseResult.row(win, {
          with: [CaseResult.graded(true)]
        }),
        CaseResult.row(loss, {
          with: [CaseResult.graded(false)]
        })
      ]
    })
    await fixture.baseline({
      name: win,
      hash: SummaryFixture.HASH,
      runs: [CaseResult.graded(false)],
      mtime: 1000
    })
    await fixture.baseline({
      name: loss,
      hash: SummaryFixture.OTHER,
      runs: [CaseResult.graded(true)],
      mtime: 1000
    })
    await fixture.baseline({
      name: win,
      hash: SummaryFixture.OTHER,
      runs: [CaseResult.graded(true)],
      mtime: 2000
    })
    await fixture.baseline({
      name: loss,
      hash: SummaryFixture.HASH,
      runs: [CaseResult.graded(false)],
      mtime: 2000
    })
    const summary = fixture.summary()
    assert.deepEqual(summary.wins.block, [win])
    assert.deepEqual(summary.losses.block, [loss])
  } finally {
    await fixture.close()
  }
})

test('a block piece takes a stored baseline of its Claude Code version',
  async () => {
    const fixture = await SummaryFixture.create()
    const name = SummaryFixture.QUESTION
    try {
      await fixture.piece({
        hashes: { [name]: SummaryFixture.HASH },
        claudeVersion: SummaryFixture.VERSION,
        cases: [CaseResult.row(name, {
          with: [CaseResult.graded(true)]
        })]
      })
      await fixture.baseline({
        name,
        hash: SummaryFixture.HASH,
        runs: [CaseResult.graded(false)],
        claudeVersion: SummaryFixture.VERSION,
        versioned: true
      })
      const summary = fixture.summary()
      assert.deepEqual(summary.wins.block, [name])
      assert.equal(summary.cases[name].arms.none.graded, 1)
      assert.equal(summary.noBaseline.includes(name), false)
    } finally {
      await fixture.close()
    }
  })

test('a block piece ignores a baseline of another version or no version',
  async () => {
    const fixture = await SummaryFixture.create()
    const other = SummaryFixture.QUESTION
    const missing = SummaryFixture.TASK
    try {
      await fixture.piece({
        hashes: {
          [other]: SummaryFixture.HASH,
          [missing]: SummaryFixture.OTHER
        },
        claudeVersion: SummaryFixture.VERSION,
        cases: [
          CaseResult.row(other, {
            with: [CaseResult.graded(true)]
          }),
          CaseResult.row(missing, {
            with: [CaseResult.graded(false)]
          })
        ]
      })
      await fixture.baseline({
        name: other,
        hash: SummaryFixture.HASH,
        runs: [CaseResult.graded(false)],
        claudeVersion: SummaryFixture.OLDER
      })
      await fixture.baseline({
        name: missing,
        hash: SummaryFixture.OTHER,
        runs: [CaseResult.graded(true)],
        claudeVersion: null
      })
      const summary = fixture.summary()
      assert.deepEqual(summary.wins.block, [])
      assert.deepEqual(summary.losses.block, [])
      assert.equal(summary.cases[other].arms.none, undefined)
      assert.equal(summary.cases[missing].arms.none, undefined)
      assert.deepEqual(summary.noBaseline, [other, missing])
      assert.ok(fixture.report().lines().includes(
        `no baseline for this case text: ${other}, ${missing}`))
    } finally {
      await fixture.close()
    }
  })

test('a baseline piece ignores a newer stored file of another version or none',
  async () => {
    // A stored file with no version is ignored as well, even when newest.
    const fixture = await SummaryFixture.create()
    const name = SummaryFixture.QUESTION
    try {
      await fixture.piece({
        arm: 'baseline',
        claudeVersion: SummaryFixture.VERSION,
        cases: [CaseResult.row(name, {
          with: [CaseResult.graded(true)],
          without: [CaseResult.graded(false)]
        })]
      })
      await fixture.baseline({
        name,
        hash: SummaryFixture.HASH,
        runs: [
          CaseResult.graded(true),
          CaseResult.graded(true)
        ],
        claudeVersion: SummaryFixture.VERSION,
        versioned: true,
        mtime: 1000
      })
      await fixture.baseline({
        name,
        hash: SummaryFixture.OTHER,
        runs: [
          CaseResult.graded(false),
          CaseResult.graded(false),
          CaseResult.graded(false)
        ],
        claudeVersion: SummaryFixture.OLDER,
        versioned: true,
        mtime: 2000
      })
      await fixture.baseline({
        name,
        hash: SummaryFixture.OTHER,
        runs: [CaseResult.graded(true)],
        claudeVersion: null,
        mtime: 3000
      })
      const summary = fixture.summary()
      assert.equal(summary.cases[name].arms.none.graded, 2)
      assert.equal(summary.cases[name].arms.none.passed, 2)
    } finally {
      await fixture.close()
    }
  })

test('a block piece with no recorded hashes uses no stored baseline',
  async () => {
    const fixture = await SummaryFixture.create()
    const question = SummaryFixture.QUESTION
    const task = SummaryFixture.TASK
    try {
      await fixture.piece({
        cases: [
          CaseResult.row(question, {
            with: [CaseResult.graded(true)]
          }),
          CaseResult.row(task, {
            with: [CaseResult.graded(false)]
          })
        ]
      })
      await fixture.baseline({
        name: question,
        hash: SummaryFixture.HASH,
        runs: [CaseResult.graded(false)]
      })
      await fixture.baseline({
        name: task,
        hash: SummaryFixture.HASH,
        runs: [CaseResult.graded(true)]
      })
      const summary = fixture.summary()
      assert.deepEqual(summary.wins.block, [])
      assert.deepEqual(summary.losses.block, [])
      assert.equal(summary.cases[question].arms.none, undefined)
      assert.ok(fixture.report().lines().includes(
        `no baseline for this case text: ${question}, ${task}`))
    } finally {
      await fixture.close()
    }
  })

test('a baseline piece with no recorded hashes keeps its no-pack runs',
  async () => {
    const fixture = await SummaryFixture.create()
    const name = SummaryFixture.QUESTION
    try {
      const noPack = [
        CaseResult.graded(false),
        CaseResult.graded(false)
      ]
      await fixture.piece({
        arm: 'baseline',
        cases: [CaseResult.row(name, {
          with: [CaseResult.graded(true)],
          without: noPack
        })]
      })
      await fixture.baseline({
        name,
        hash: SummaryFixture.HASH,
        runs: noPack,
        mtime: Date.now()
      })
      const summary = fixture.summary()
      assert.equal(summary.cases[name].arms.none.graded, 2)
      assert.deepEqual(summary.wins.baseline, [name])
      assert.deepEqual(summary.losses.baseline, [])
      assert.equal((summary.noBaseline ?? []).length, 0)
      assert.equal(fixture.report().lines().some((line) =>
        line.startsWith('no baseline for this case text:')), false)
    } finally {
      await fixture.close()
    }
  })

test('two pieces of one case count a stored baseline once', async () => {
  const fixture = await SummaryFixture.create()
  const name = SummaryFixture.QUESTION
  try {
    const runs = [
      CaseResult.graded(false),
      CaseResult.graded(true),
      CaseResult.graded(false)
    ]
    await fixture.piece({
      name: 'baseline',
      arm: 'baseline',
      cases: [CaseResult.row(name, {
        with: [CaseResult.graded(true)],
        without: runs
      })]
    })
    await fixture.piece({
      name: 'block',
      hashes: { [name]: SummaryFixture.HASH },
      cases: [CaseResult.row(name, {
        with: [CaseResult.graded(true)]
      })]
    })
    await fixture.baseline({
      name,
      hash: SummaryFixture.HASH,
      runs
    })
    const summary = fixture.summary()
    assert.equal(
      summary.cases[name].arms.none.graded, runs.length)
  } finally {
    await fixture.close()
  }
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
