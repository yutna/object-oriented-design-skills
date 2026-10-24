import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'

import { Check } from '../check.mjs'
import { RepoError } from '../errors.mjs'
import { EvalQueue } from './eval-queue.mjs'
import { QuotaPolicy } from './quota-policy.mjs'

export class QueueRun extends Check {
  static #USAGE = 'usage: eval-queue.mjs --status | ' +
    '--add <label> -- <script> [args...] | --pause <text> | ' +
    '--run [--dry-run] [--seven-day-start <n>] ' +
    '[--seven-day-continue <n>]'
  static #RUNS = 'evals/results/runs.jsonl'
  static #PIECES = 'evals/results/pieces'

  #repository
  #argv
  #meter
  #runner
  #clock

  constructor(repository, argv, meter, runner, clock) {
    super()
    this.#repository = repository
    this.#argv = Object.freeze([...argv])
    this.#meter = meter
    this.#runner = runner
    this.#clock = clock
    Object.freeze(this)
  }

  get name() {
    return 'eval-queue'
  }

  inspect(report) {
    const queue = new EvalQueue(this.#repository)
    const argv = this.#argv
    if (argv[0] === '--status') {
      // Status is read-only, so an empty queue is the only failure.
      if (argv.length !== 1) throw new RepoError(QueueRun.#USAGE)
      this.#status(queue, report)
      return
    }
    if (argv[0] === '--add') {
      this.#add(queue, report)
      return
    }
    if (argv[0] === '--pause') {
      this.#pause(queue, report)
      return
    }
    if (argv.includes('--run')) {
      this.#run(queue, report, argv.includes('--dry-run'))
      return
    }
    throw new RepoError(QueueRun.#USAGE)
  }

  #status(queue, report) {
    // Status never takes a quota reading; it only reports the backlog.
    const entries = queue.entries()
    for (const [index, entry] of entries.entries()) {
      report.note(`${index + 1}. ${this.#describe(entry)}`)
    }
    report.count('queued entry(ies)', entries.length)
  }

  #add(queue, report) {
    const separator = this.#argv.indexOf('--')
    const label = this.#argv[1]
    // Everything after the separator belongs to the piece, flags included.
    if (separator !== 2 || this.#argv.length < 4 ||
      label === undefined || label === '') {
      throw new RepoError(QueueRun.#USAGE)
    }
    const script = this.#argv[separator + 1]
    const args = this.#argv.slice(separator + 2)
    const id = `eval-${this.#clock.now().getTime()}`
    queue.add({ id, label, script, args })
    report.count('queued entry(ies)', queue.entries().length)
  }

  #pause(queue, report) {
    const text = this.#argv.slice(1).join(' ').trim()
    // A pause carries the note to read before the queue resumes.
    if (text === '') throw new RepoError(QueueRun.#USAGE)
    queue.add({ pause: text })
    report.count('queued entry(ies)', queue.entries().length)
  }

  #run(queue, report, dryRun) {
    const lines = this.#sevenDayLines()
    const first = queue.peek()
    if (dryRun) {
      // A dry run previews the next entry without reading quota.
      if (first !== null) report.note(this.#preview(first))
      report.count('entry(ies) previewed', first === null ? 0 : 1)
      return
    }
    const policy = new QuotaPolicy(lines)
    let piecesRun = 0
    let paused = false
    let waiting = 0
    while (true) {
      const entry = queue.peek()
      if (entry === null) break
      if (entry.pause !== undefined) {
        // A pause is consumed once its note has been printed.
        report.note(`PAUSE: ${entry.pause}`)
        queue.drop()
        paused = true
        break
      }
      const before = this.#meter.read()
      if (!policy.mayStart(before)) {
        // A WAIT is not a failure: the piece stays queued for the reset.
        waiting = this.#waitingCount(queue)
        report.note(this.#waitLine(before))
        break
      }
      const commit = this.#commit()
      const dirty = this.#dirty()
      const startedAt = this.#clock.now().toISOString()
      const result = this.#runPiece(entry)
      const endedAt = this.#clock.now().toISOString()
      const after = this.#meter.read()
      const log = this.#logPath(entry.id)
      this.#writeLog(log, result.output)
      this.#appendRun({
        id: entry.id,
        label: entry.label,
        script: entry.script,
        args: entry.args,
        commit,
        dirty,
        startedAt,
        endedAt,
        log,
        exitStatus: result.exitCode,
        quotaBefore: before,
        quotaAfter: after
      })
      queue.drop()
      piecesRun += 1
      // A failed measurement is recorded, not hidden, so it is a note.
      if (result.exitCode !== 0) {
        report.note(
          `piece ${entry.id} exited ${result.exitCode}; see ${log}`)
      }
      if (!policy.mayContinue(after)) break
    }
    this.#count(report, { piecesRun, paused, waiting })
  }

  #sevenDayLines() {
    let start
    let end
    const argv = this.#argv
    for (let index = 0; index < argv.length;) {
      const argument = argv[index]
      if (argument === '--run' || argument === '--dry-run') {
        index += 1
        continue
      }
      if (argument === '--seven-day-start') {
        start = QueueRun.#percentage(argument, argv[index + 1])
        index += 2
        continue
      }
      if (argument === '--seven-day-continue') {
        end = QueueRun.#percentage(argument, argv[index + 1])
        index += 2
        continue
      }
      throw new RepoError(QueueRun.#USAGE)
    }
    // A pair is only comparable when the sitting sets both.
    if (start !== undefined && end !== undefined && start >= end) {
      throw new RepoError(
        '--seven-day-start must be below --seven-day-continue', 2)
    }
    return Object.freeze({
      sevenDayStart: start,
      sevenDayContinue: end
    })
  }

  static #percentage(option, value) {
    const parsed = /^\d+$/.test(value ?? '') ? Number(value) : NaN
    // A quota line is a whole percent and never reaches either end.
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new RepoError(
        `${option} must be a whole percentage from 1 to 100`, 2)
    }
    return parsed
  }

  #count(report, { piecesRun, paused, waiting }) {
    if (piecesRun > 0) {
      report.count('piece(s) run', piecesRun)
      return
    }
    if (paused) {
      // A pause alone is the result, not a run that measured nothing.
      report.count('pause(s) read', 1)
      return
    }
    if (waiting > 0) {
      report.count('piece(s) waiting', waiting)
      return
    }
    // An empty run is a failed measurement, not a clean pass.
    report.count('piece(s) run', 0)
  }

  #waitingCount(queue) {
    return queue.entries().filter((entry) =>
      entry.pause === undefined).length
  }

  #waitLine(reading) {
    return `WAIT: 5h=${reading.fiveHour}% 7d=${reading.sevenDay}%; ` +
      'the five-hour window resets ' +
      this.#clock.hhmm(reading.fiveHourResetsAt)
  }

  #preview(entry) {
    if (entry.pause !== undefined) return `PAUSE: ${entry.pause}`
    return `RUN: ${QueueRun.#command(entry)}`
  }

  #describe(entry) {
    if (entry.pause !== undefined) return `pause: ${entry.pause}`
    return `${entry.label} [${entry.id}]: ${QueueRun.#command(entry)}`
  }

  static #command(entry) {
    return ['node', entry.script, ...entry.args].join(' ')
  }

  #commit() {
    const { exitCode, output } = this.#runner.run(
      'git',
      ['rev-parse', 'HEAD'],
      this.#repository.root)
    // A run line without the checkout's HEAD cannot be reproduced.
    if (exitCode !== 0) {
      throw new RepoError(`cannot read HEAD: ${output.trim()}`)
    }
    return output.trim()
  }

  #dirty() {
    const { exitCode, output } = this.#runner.run(
      'git',
      ['status', '--porcelain'],
      this.#repository.root)
    // Dirty means the checkout differs from the commit named beside it.
    if (exitCode !== 0) {
      throw new RepoError(`cannot read git status: ${output.trim()}`)
    }
    return output.trim() !== ''
  }

  #runPiece(entry) {
    // A tier script refuses to call a model unless this flag is present.
    const previous = process.env.OO_EVAL_QUEUE
    process.env.OO_EVAL_QUEUE = '1'
    try {
      return this.#runner.run(
        process.execPath,
        [entry.script, ...entry.args],
        this.#repository.root)
    } finally {
      if (previous === undefined) delete process.env.OO_EVAL_QUEUE
      else process.env.OO_EVAL_QUEUE = previous
    }
  }

  #logPath(id) {
    // The recorded path is repository notation, not platform notation.
    return posix.join(QueueRun.#PIECES, `${id}.log`)
  }

  #writeLog(log, output) {
    const path = join(this.#repository.root, log)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, output)
  }

  #appendRun(record) {
    // The run log stays local; README numbers only arrive through an issue.
    mkdirSync(
      join(this.#repository.root, 'evals', 'results'),
      { recursive: true })
    appendFileSync(
      join(this.#repository.root, QueueRun.#RUNS),
      `${JSON.stringify(record)}\n`)
  }
}
