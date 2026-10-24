import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { Cli } from '../../../scripts/lib/cli.mjs'
import { QuotaReading } from '../../../scripts/lib/evals/quota-reading.mjs'
import { QueueRun } from '../../../scripts/lib/evals/queue-run.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class FakeProcess {
  #stdoutChunks = []
  #stderrChunks = []

  constructor() {
    this.exitCode = undefined
    this.stdout = {
      write: (chunk) => this.#stdoutChunks.push(chunk)
    }
    this.stderr = {
      write: (chunk) => this.#stderrChunks.push(chunk)
    }
  }

  get stdoutChunks() {
    return this.#stdoutChunks
  }

  get stderrChunks() {
    return this.#stderrChunks
  }
}

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

class FakeMeter {
  #readings
  #reads = 0

  constructor(readings) {
    this.#readings = [...readings]
  }

  read() {
    this.#reads += 1
    const reading = this.#readings.shift()
    if (reading === undefined) throw new Error('unexpected quota read')
    return reading
  }

  get reads() {
    return this.#reads
  }
}

class FakeRunner {
  #calls = []
  #dirty
  #piece

  constructor({ dirty = false, exitCode = 0, output = 'piece done\n' } = {}) {
    this.#dirty = dirty
    this.#piece = { exitCode, output }
  }

  run(command, args, cwd) {
    this.#calls.push({
      command,
      args: [...args],
      cwd,
      queueEnv: process.env.OO_EVAL_QUEUE
    })
    if (command === 'git' && args[0] === 'rev-parse') {
      return { exitCode: 0, output: 'abc123\n' }
    }
    if (command === 'git' && args[0] === 'status') {
      return {
        exitCode: 0,
        output: this.#dirty ? ' M evals/x\n' : ''
      }
    }
    return { ...this.#piece }
  }

  get calls() {
    return this.#calls
  }

  get pieceCalls() {
    return this.#calls.filter(({ command }) => command === process.execPath)
  }
}

class FakeClock {
  #dates
  #index = 0

  constructor(dates) {
    this.#dates = [...dates]
  }

  now() {
    const date = this.#dates[this.#index]
    this.#index += 1
    if (date === undefined) throw new Error('unexpected clock read')
    return new Date(date)
  }

  hhmm() {
    return '13:00'
  }
}

class Times {
  static add() {
    return [Date.UTC(2026, 9, 23, 9, 0, 0)]
  }

  static pieceRun() {
    return [
      Date.UTC(2026, 9, 23, 10, 0, 0),
      Date.UTC(2026, 9, 23, 10, 0, 5)
    ]
  }

  static twoPieces() {
    return [
      Date.UTC(2026, 9, 23, 10, 0, 0),
      Date.UTC(2026, 9, 23, 10, 0, 5),
      Date.UTC(2026, 9, 23, 10, 0, 10),
      Date.UTC(2026, 9, 23, 10, 0, 15)
    ]
  }
}

class ReadingAt {
  static of(fiveHour, sevenDay) {
    return new QuotaReading(
      fiveHour,
      sevenDay,
      1792783200,
      1793127600)
  }
}

class PieceEntry {
  static first() {
    return {
      id: 'p1',
      label: 'piece one',
      script: 'evals/piece.mjs',
      args: ['--arm', 'clinic']
    }
  }

  static second() {
    return {
      id: 'p2',
      label: 'piece two',
      script: 'evals/other.mjs',
      args: []
    }
  }
}

class TempRun {
  static async of(entries = []) {
    const root = await mkdtemp(join(tmpdir(), 'oo-queue-run-'))
    if (entries.length > 0) {
      const directory = join(root, 'evals', 'results')
      await mkdir(directory, { recursive: true })
      await writeFile(
        join(directory, 'queue.json'),
        `${JSON.stringify(entries, null, 2)}\n`)
    }
    return new TempRun(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  inspect(argv, meter, runner = new FakeRunner(),
    clock = new FakeClock(Times.pieceRun())) {
    const report = new Report()
    new QueueRun(
      new FakeRepository(this.#root),
      argv,
      meter,
      runner,
      clock).inspect(report)
    return report
  }

  async exitOf(argv, meter, runner = new FakeRunner()) {
    const processLike = new FakeProcess()
    await new Cli(processLike).run(new QueueRun(
      new FakeRepository(this.#root),
      argv,
      meter,
      runner,
      new FakeClock([])))
    return processLike
  }

  async queue() {
    const path = join(this.#root, 'evals', 'results', 'queue.json')
    if (!existsSync(path)) return []
    return JSON.parse(await readFile(path, 'utf8'))
  }

  async runs() {
    const path = join(this.#root, 'evals', 'results', 'runs.jsonl')
    if (!existsSync(path)) return []
    const text = await readFile(path, 'utf8')
    return text.trim().split('\n').filter(Boolean).map((line) =>
      JSON.parse(line))
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('--status fails on an empty queue with measured nothing', async () => {
  const fixture = await TempRun.of()
  try {
    const meter = new FakeMeter([])
    const report = fixture.inspect(['--status'], meter)
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      'failed: measured nothing (0 queued entry(ies))'
    ])
    assert.equal(meter.reads, 0)
  } finally {
    await fixture.close()
  }
})

test('--status prints a pause entry and counts it', async () => {
  const fixture = await TempRun.of([{ pause: 'read the plan' }])
  try {
    const meter = new FakeMeter([])
    const report = fixture.inspect(['--status'], meter)
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      '1. pause: read the plan',
      'ok 1 queued entry(ies)'
    ])
    assert.equal(meter.reads, 0)
  } finally {
    await fixture.close()
  }
})

test('--status prints a piece entry and counts it', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const report = fixture.inspect(['--status'], new FakeMeter([]))
    assert.deepEqual(report.lines(), [
      '1. piece one [p1]: node evals/piece.mjs --arm clinic',
      'ok 1 queued entry(ies)'
    ])
  } finally {
    await fixture.close()
  }
})

test('--add keeps every argument after the separator for the piece',
  async () => {
    const fixture = await TempRun.of()
    try {
      const meter = new FakeMeter([])
      const runner = new FakeRunner()
      const report = fixture.inspect(
        ['--add', 'piece one', '--', 'evals/piece.mjs',
          '--arm', '--dry-run'],
        meter,
        runner,
        new FakeClock(Times.add()))
      assert.deepEqual(report.lines(), ['ok 1 queued entry(ies)'])
      assert.deepEqual(await fixture.queue(), [{
        id: `eval-${Date.UTC(2026, 9, 23, 9, 0, 0)}`,
        label: 'piece one',
        script: 'evals/piece.mjs',
        args: ['--arm', '--dry-run']
      }])
      assert.equal(meter.reads, 0)
      assert.equal(runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--pause appends a pause entry and counts it', async () => {
  const fixture = await TempRun.of()
  try {
    const report = fixture.inspect(
      ['--pause', 'read the reset note'],
      new FakeMeter([]))
    assert.deepEqual(report.lines(), ['ok 1 queued entry(ies)'])
    assert.deepEqual(await fixture.queue(), [
      { pause: 'read the reset note' }
    ])
  } finally {
    await fixture.close()
  }
})

test('--run prints a pause, drops it, and stops', async () => {
  const fixture = await TempRun.of([
    { pause: 'read the plan' },
    PieceEntry.first()
  ])
  try {
    const meter = new FakeMeter([])
    const runner = new FakeRunner()
    const report = fixture.inspect(['--run'], meter, runner)
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'PAUSE: read the plan',
      'ok 1 pause(s) read'
    ])
    assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
    assert.deepEqual(await fixture.runs(), [])
    assert.equal(meter.reads, 0)
    assert.equal(runner.calls.length, 0)
  } finally {
    await fixture.close()
  }
})

test('--run waits without running or changing the queue', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const meter = new FakeMeter([ReadingAt.of(75, 48)])
    const runner = new FakeRunner()
    const report = fixture.inspect(['--run'], meter, runner)
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'WAIT: 5h=75% 7d=48%; the five-hour window resets 13:00',
      'ok 1 piece(s) waiting'
    ])
    assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
    assert.deepEqual(await fixture.runs(), [])
    assert.equal(meter.reads, 1)
    assert.equal(runner.calls.length, 0)
  } finally {
    await fixture.close()
  }
})

test('--run logs one line with both readings and drops the piece',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    const previous = process.env.OO_EVAL_QUEUE
    try {
      const meter = new FakeMeter([
        ReadingAt.of(10, 20),
        ReadingAt.of(12, 21)
      ])
      const runner = new FakeRunner()
      const clock = new FakeClock(Times.pieceRun())
      const report = fixture.inspect(['--run'], meter, runner, clock)
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
      assert.equal(meter.reads, 2)
      assert.deepEqual(await fixture.queue(), [])
      assert.deepEqual(await fixture.runs(), [{
        id: 'p1',
        label: 'piece one',
        script: 'evals/piece.mjs',
        args: ['--arm', 'clinic'],
        commit: 'abc123',
        dirty: false,
        startedAt: '2026-10-23T10:00:00.000Z',
        endedAt: '2026-10-23T10:00:05.000Z',
        log: 'evals/results/pieces/p1.log',
        exitStatus: 0,
        quotaBefore: {
          fiveHour: 10,
          sevenDay: 20,
          fiveHourResetsAt: 1792783200,
          sevenDayResetsAt: 1793127600
        },
        quotaAfter: {
          fiveHour: 12,
          sevenDay: 21,
          fiveHourResetsAt: 1792783200,
          sevenDayResetsAt: 1793127600
        }
      }])
      const [piece] = runner.pieceCalls
      assert.equal(piece.command, process.execPath)
      assert.deepEqual(piece.args, [
        'evals/piece.mjs',
        '--arm',
        'clinic'
      ])
      assert.equal(piece.cwd, fixture.root)
      assert.equal(piece.queueEnv, '1')
      assert.equal(process.env.OO_EVAL_QUEUE, previous)
    } finally {
      if (previous === undefined) delete process.env.OO_EVAL_QUEUE
      else process.env.OO_EVAL_QUEUE = previous
      await fixture.close()
    }
  })

test('--run writes the combined output to the piece log', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const meter = new FakeMeter([
      ReadingAt.of(10, 20),
      ReadingAt.of(12, 21)
    ])
    const report = fixture.inspect(
      ['--run'],
      meter,
      new FakeRunner({ output: 'arm=clinic\nverdict=pass\n' }),
      new FakeClock(Times.pieceRun()))
    assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
    const path = join(fixture.root, 'evals', 'results', 'pieces', 'p1.log')
    assert.equal(existsSync(path), true)
    assert.equal(await readFile(path, 'utf8'), 'arm=clinic\nverdict=pass\n')
  } finally {
    await fixture.close()
  }
})

test('--run notes a non-zero exit and still passes', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const meter = new FakeMeter([
      ReadingAt.of(10, 20),
      ReadingAt.of(12, 21)
    ])
    const report = fixture.inspect(
      ['--run'],
      meter,
      new FakeRunner({ exitCode: 1, output: 'tier 1 failed\n' }),
      new FakeClock(Times.pieceRun()))
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'piece p1 exited 1; see evals/results/pieces/p1.log',
      'ok 1 piece(s) run'
    ])
  } finally {
    await fixture.close()
  }
})

test('--run records the log path relative to the repository', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const meter = new FakeMeter([
      ReadingAt.of(10, 20),
      ReadingAt.of(12, 21)
    ])
    fixture.inspect(
      ['--run'],
      meter,
      new FakeRunner(),
      new FakeClock(Times.pieceRun()))
    const [run] = await fixture.runs()
    assert.equal(run.log, 'evals/results/pieces/p1.log')
  } finally {
    await fixture.close()
  }
})

test('--run records a dirty checkout in the run line', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const meter = new FakeMeter([
      ReadingAt.of(10, 20),
      ReadingAt.of(12, 21)
    ])
    const report = fixture.inspect(
      ['--run'],
      meter,
      new FakeRunner({ dirty: true }),
      new FakeClock(Times.pieceRun()))
    assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
    const [run] = await fixture.runs()
    assert.equal(run.commit, 'abc123')
    assert.equal(run.dirty, true)
  } finally {
    await fixture.close()
  }
})

test('--run goes on to the next piece while mayContinue', async () => {
  const fixture = await TempRun.of([
    PieceEntry.first(),
    PieceEntry.second()
  ])
  try {
    const meter = new FakeMeter([
      ReadingAt.of(10, 20),
      ReadingAt.of(12, 21),
      ReadingAt.of(30, 40),
      ReadingAt.of(32, 41)
    ])
    const report = fixture.inspect(
      ['--run'],
      meter,
      new FakeRunner(),
      new FakeClock(Times.twoPieces()))
    assert.deepEqual(report.lines(), ['ok 2 piece(s) run'])
    assert.equal(meter.reads, 4)
    assert.deepEqual(await fixture.queue(), [])
    const runs = await fixture.runs()
    assert.deepEqual(runs.map(({ id }) => id), ['p1', 'p2'])
  } finally {
    await fixture.close()
  }
})

test('--run stops when the second reading refuses mayContinue',
  async () => {
    const fixture = await TempRun.of([
      PieceEntry.first(),
      PieceEntry.second()
    ])
    try {
      const meter = new FakeMeter([
        ReadingAt.of(10, 20),
        ReadingAt.of(70, 80)
      ])
      const report = fixture.inspect(
        ['--run'],
        meter,
        new FakeRunner(),
        new FakeClock(Times.pieceRun()))
      assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
      assert.equal(meter.reads, 2)
      assert.deepEqual(await fixture.queue(), [PieceEntry.second()])
      assert.equal((await fixture.runs()).length, 1)
    } finally {
      await fixture.close()
    }
  })

test('--run --dry-run prints the piece and reads nothing', async () => {
  const fixture = await TempRun.of([PieceEntry.first()])
  try {
    const meter = new FakeMeter([])
    const runner = new FakeRunner()
    const report = fixture.inspect(
      ['--run', '--dry-run'],
      meter,
      runner,
      new FakeClock([]))
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'RUN: node evals/piece.mjs --arm clinic',
      'ok 1 entry(ies) previewed'
    ])
    assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
    assert.equal(meter.reads, 0)
    assert.equal(runner.calls.length, 0)
  } finally {
    await fixture.close()
  }
})

test('--run --dry-run accepts a seven-day line and reads nothing',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([])
      const runner = new FakeRunner()
      const report = fixture.inspect(
        ['--run', '--dry-run', '--seven-day-start', '90'],
        meter,
        runner,
        new FakeClock([]))
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'RUN: node evals/piece.mjs --arm clinic',
        'ok 1 entry(ies) previewed'
      ])
      assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
      assert.equal(meter.reads, 0)
      assert.equal(runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--run starts on an 80% seven-day reading with --seven-day-start 90',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([
        ReadingAt.of(10, 80),
        ReadingAt.of(12, 81)
      ])
      const report = fixture.inspect(
        ['--run', '--seven-day-start', '90'],
        meter,
        new FakeRunner(),
        new FakeClock(Times.pieceRun()))
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
      assert.equal(meter.reads, 2)
      assert.deepEqual(await fixture.queue(), [])
    } finally {
      await fixture.close()
    }
  })

test('--run waits on an 80% seven-day reading without --seven-day-start',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([ReadingAt.of(10, 80)])
      const runner = new FakeRunner()
      const report = fixture.inspect(['--run'], meter, runner)
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'WAIT: 5h=10% 7d=80%; the five-hour window resets 13:00',
        'ok 1 piece(s) waiting'
      ])
      assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
      assert.equal(meter.reads, 1)
      assert.equal(runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--run stops after one piece when --seven-day-continue is 80',
  async () => {
    const fixture = await TempRun.of([
      PieceEntry.first(),
      PieceEntry.second()
    ])
    try {
      const meter = new FakeMeter([
        ReadingAt.of(10, 20),
        ReadingAt.of(12, 81)
      ])
      const report = fixture.inspect(
        ['--run', '--seven-day-continue', '80'],
        meter,
        new FakeRunner(),
        new FakeClock(Times.pieceRun()))
      assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
      assert.equal(meter.reads, 2)
      assert.deepEqual(await fixture.queue(), [PieceEntry.second()])
    } finally {
      await fixture.close()
    }
  })

test('--run refuses a seven-day line outside 1 to 100', async () => {
  const fixture = await TempRun.of()
  try {
    for (const [option, value] of [
      ['--seven-day-start', '0'],
      ['--seven-day-continue', '101'],
      ['--seven-day-start', '90.5']
    ]) {
      const processLike = await fixture.exitOf(
        ['--run', option, value],
        new FakeMeter([]))
      assert.equal(processLike.exitCode, 2, `${option} ${value}`)
      assert.deepEqual(processLike.stderrChunks, [
        `error: ${option} must be a whole percentage from 1 to 100\n`
      ])
      assert.deepEqual(processLike.stdoutChunks, [])
    }
  } finally {
    await fixture.close()
  }
})

test('--run refuses a seven-day line with no value', async () => {
  const fixture = await TempRun.of()
  try {
    const processLike = await fixture.exitOf(
      ['--run', '--seven-day-start'],
      new FakeMeter([]))
    assert.equal(processLike.exitCode, 2)
    assert.deepEqual(processLike.stderrChunks, [
      'error: --seven-day-start must be a whole percentage from 1 to 100\n'
    ])
    assert.deepEqual(processLike.stdoutChunks, [])
  } finally {
    await fixture.close()
  }
})

test('--run refuses a seven-day start above the continue', async () => {
  const fixture = await TempRun.of()
  try {
    const processLike = await fixture.exitOf(
      ['--run', '--seven-day-start', '90', '--seven-day-continue', '90'],
      new FakeMeter([]))
    assert.equal(processLike.exitCode, 2)
    assert.deepEqual(processLike.stderrChunks, [
      'error: --seven-day-start must be below --seven-day-continue\n'
    ])
    assert.deepEqual(processLike.stdoutChunks, [])
  } finally {
    await fixture.close()
  }
})

test('--run --dry-run accepts a five-hour line and reads nothing',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([])
      const runner = new FakeRunner()
      const report = fixture.inspect(
        ['--run', '--dry-run', '--five-hour-start', '90'],
        meter,
        runner,
        new FakeClock([]))
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'RUN: node evals/piece.mjs --arm clinic',
        'ok 1 entry(ies) previewed'
      ])
      assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
      assert.equal(meter.reads, 0)
      assert.equal(runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--run starts on an 80% five-hour reading with --five-hour-start 90',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([
        ReadingAt.of(80, 10),
        ReadingAt.of(81, 12)
      ])
      const report = fixture.inspect(
        ['--run', '--five-hour-start', '90'],
        meter,
        new FakeRunner(),
        new FakeClock(Times.pieceRun()))
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), ['ok 1 piece(s) run'])
      assert.equal(meter.reads, 2)
      assert.deepEqual(await fixture.queue(), [])
    } finally {
      await fixture.close()
    }
  })

test('--run waits on an 80% five-hour reading without --five-hour-start',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([ReadingAt.of(80, 10)])
      const runner = new FakeRunner()
      const report = fixture.inspect(['--run'], meter, runner)
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'WAIT: 5h=80% 7d=10%; the five-hour window resets 13:00',
        'ok 1 piece(s) waiting'
      ])
      assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
      assert.equal(meter.reads, 1)
      assert.equal(runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--run keeps the seven-day line at 75 beside --five-hour-start 90',
  async () => {
    const fixture = await TempRun.of([PieceEntry.first()])
    try {
      const meter = new FakeMeter([ReadingAt.of(85, 80)])
      const report = fixture.inspect(
        ['--run', '--five-hour-start', '90'],
        meter)
      assert.deepEqual(report.lines(), [
        'WAIT: 5h=85% 7d=80%; the five-hour window resets 13:00',
        'ok 1 piece(s) waiting'
      ])
      assert.deepEqual(await fixture.queue(), [PieceEntry.first()])
      assert.equal(meter.reads, 1)
    } finally {
      await fixture.close()
    }
  })

test('--run goes on to the next piece with --five-hour-continue 80',
  async () => {
    const fixture = await TempRun.of([
      PieceEntry.first(),
      PieceEntry.second()
    ])
    try {
      const meter = new FakeMeter([
        ReadingAt.of(10, 20),
        ReadingAt.of(75, 21),
        ReadingAt.of(30, 40),
        ReadingAt.of(32, 41)
      ])
      const report = fixture.inspect(
        ['--run', '--five-hour-continue', '80'],
        meter,
        new FakeRunner(),
        new FakeClock(Times.twoPieces()))
      assert.deepEqual(report.lines(), ['ok 2 piece(s) run'])
      assert.equal(meter.reads, 4)
      assert.deepEqual(await fixture.queue(), [])
    } finally {
      await fixture.close()
    }
  })

test('--run refuses a five-hour line outside 1 to 100', async () => {
  const fixture = await TempRun.of()
  try {
    for (const [option, value] of [
      ['--five-hour-start', '0'],
      ['--five-hour-continue', '101'],
      ['--five-hour-start', '90.5']
    ]) {
      const processLike = await fixture.exitOf(
        ['--run', option, value],
        new FakeMeter([]))
      assert.equal(processLike.exitCode, 2, `${option} ${value}`)
      assert.deepEqual(processLike.stderrChunks, [
        `error: ${option} must be a whole percentage from 1 to 100\n`
      ])
      assert.deepEqual(processLike.stdoutChunks, [])
    }
  } finally {
    await fixture.close()
  }
})

test('--run refuses a five-hour line with no value', async () => {
  const fixture = await TempRun.of()
  try {
    const processLike = await fixture.exitOf(
      ['--run', '--five-hour-start'],
      new FakeMeter([]))
    assert.equal(processLike.exitCode, 2)
    assert.deepEqual(processLike.stderrChunks, [
      'error: --five-hour-start must be a whole percentage from 1 to 100\n'
    ])
    assert.deepEqual(processLike.stdoutChunks, [])
  } finally {
    await fixture.close()
  }
})

test('--run refuses a five-hour start above the continue', async () => {
  const fixture = await TempRun.of()
  try {
    const processLike = await fixture.exitOf(
      ['--run', '--five-hour-start', '70', '--five-hour-continue', '70'],
      new FakeMeter([]))
    assert.equal(processLike.exitCode, 2)
    assert.deepEqual(processLike.stderrChunks, [
      'error: --five-hour-start must be below --five-hour-continue\n'
    ])
    assert.deepEqual(processLike.stdoutChunks, [])
  } finally {
    await fixture.close()
  }
})
