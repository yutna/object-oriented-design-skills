import { Check } from '../check.mjs'
import { RepoError } from '../errors.mjs'
import { EvalBuild } from '../evals/eval-build.mjs'
import { EvalQueue } from '../evals/eval-queue.mjs'
import { PluginCopy } from '../evals/plugin-copy.mjs'
import { PluginEvalRun } from '../evals/plugin-eval-run.mjs'

export class EvalPluginCheck extends Check {
  static #SWITCHES = Object.freeze(['--dry-run', '--queue'])
  static #VALUES = Object.freeze([
    '--arm', '--only', '--tag', '--model', '--judge-model',
    '--max-cost-usd', '--runs'
  ])
  static #ARMS = Object.freeze(['block', 'baseline'])
  static #DEFAULT_RUNS = 1
  // The queue pauses after its first piece so a person can read the traces
  // before the next piece spends more quota.
  static #PAUSE = 'read the traces of piece 1 before more runs'

  #repository
  #argv
  #runner
  #clock

  constructor(repository, argv, runner, clock) {
    super()
    this.#repository = repository
    this.#argv = Object.freeze([...argv])
    this.#runner = runner
    this.#clock = clock
    Object.freeze(this)
  }

  get name() {
    return 'eval-plugin'
  }

  inspect(report) {
    const options = this.#options()
    if (options.dryRun && options.queue) {
      throw new RepoError(
        '--dry-run and --queue cannot be combined', 2)
    }
    // A direct run would spend quota outside the measurement the queue keeps.
    if (!options.dryRun && !options.queue &&
      process.env.OO_EVAL_QUEUE !== '1') {
      throw new RepoError(
        'run it through scripts/eval-queue.mjs (OO_EVAL_QUEUE=1)', 2)
    }
    const runs = this.#runs(options)
    if (options.dryRun) {
      this.#dryRun(runs, report)
      return
    }
    if (options.queue) {
      this.#enqueue(runs, report)
      return
    }
    this.#run(runs, report)
  }

  #runs(options) {
    // A planning copy lists the selected cases; each piece then builds its
    // own copy with only its cases, so no piece sees another piece's cases.
    const copy = PluginCopy.of(this.#repository)
    let cases
    try {
      cases = new EvalBuild(this.#repository, copy).build(options)
    } finally {
      copy.close()
    }
    return PluginEvalRun.pieces(cases).map((piece) =>
      new PluginEvalRun(
        this.#repository, this.#runner, this.#clock, options, piece))
  }

  #dryRun(runs, report) {
    let cases = 0
    try {
      for (const run of runs) {
        report.note(`piece ${run.name} (${run.caseNames.length} case(s))`)
        report.note(`cases: ${run.caseNames.join(', ')}`)
        // The line is exact: the same args reach the runner in a queue slot.
        report.note(`command: ${run.commandLine()}`)
        cases += run.caseNames.length
      }
    } catch (error) {
      for (const run of runs) run.close()
      throw error
    }
    report.count('case(s) built', cases)
  }

  #enqueue(runs, report) {
    const queue = new EvalQueue(this.#repository)
    for (const [index, run] of runs.entries()) {
      queue.add(run.queueEntry())
      // The pause follows the first piece and holds the queue before piece 2.
      if (index === 0) queue.add({ pause: EvalPluginCheck.#PAUSE })
      report.note(`queued: ${run.name} (${run.caseNames.length} case(s))`)
    }
    report.count('piece(s) queued', runs.length)
  }

  #run(runs, report) {
    let pieces = 0
    for (const run of runs) {
      run.execute(report)
      pieces += 1
    }
    report.count('piece(s) run', pieces)
  }

  #options() {
    this.#rejectUnknown()
    const arm = this.#value('--arm') ?? 'block'
    if (!EvalPluginCheck.#ARMS.includes(arm)) {
      throw new RepoError(
        `--arm must be block or baseline, not "${arm}"`, 2)
    }
    const onlyText = this.#value('--only')
    const only = onlyText === null
      ? []
      : onlyText.split(',').map((name) => name.trim()).filter(Boolean)
    if (onlyText !== null && only.length === 0) {
      throw new RepoError('--only needs at least one case name', 2)
    }
    const maxCostText = this.#required('--max-cost-usd')
    const maxCostUsd = Number(maxCostText)
    if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) {
      throw new RepoError(
        `--max-cost-usd must be a number above 0, not ` +
        `"${maxCostText}"`, 2)
    }
    const runsText = this.#value('--runs')
    const runs = runsText === null
      ? EvalPluginCheck.#DEFAULT_RUNS
      : Number(runsText)
    if (!Number.isInteger(runs) || runs < 1) {
      throw new RepoError(
        `--runs must be a whole number, 1 or more, not "${runsText}"`, 2)
    }
    return Object.freeze({
      dryRun: this.#argv.includes('--dry-run'),
      queue: this.#argv.includes('--queue'),
      arm,
      only: Object.freeze(only),
      tag: this.#value('--tag'),
      model: this.#required('--model'),
      judgeModel: this.#required('--judge-model'),
      maxCostUsd,
      runs
    })
  }

  #required(flag) {
    const value = this.#value(flag)
    if (value === null) {
      throw new RepoError(`${flag} is required`, 2)
    }
    return value
  }

  #rejectUnknown() {
    // A misspelt flag would otherwise build a suite the caller did not ask for.
    for (const [index, argument] of this.#argv.entries()) {
      if (EvalPluginCheck.#SWITCHES.includes(argument)) continue
      if (EvalPluginCheck.#VALUES.includes(argument)) continue
      if (index > 0 &&
        EvalPluginCheck.#VALUES.includes(this.#argv[index - 1])) continue
      throw new RepoError(`unknown argument ${argument}`, 2)
    }
  }

  #value(flag) {
    const at = this.#argv.indexOf(flag)
    if (at === -1) return null
    const value = this.#argv[at + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new RepoError(`${flag} needs a value`, 2)
    }
    return value
  }
}
