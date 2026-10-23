import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join } from 'node:path'

import { RepoError } from '../errors.mjs'
import { EvalBuild } from './eval-build.mjs'
import { PluginCopy } from './plugin-copy.mjs'

export class PluginEvalRun {
  static #MAX_CASES = 6
  static #QUESTION = 'question'
  static #QUESTIONS = 'questions'
  static #TASKS = 'tasks'
  static #RESULT = 'result.json'
  static #RUN = 'run.json'
  static #RESULTS = 'evals/results'
  static #BASELINES = 'baselines'
  static #TRACES = 'traces'
  static #CLAUDE = 'claude'
  static #SCAFFOLD = /^e-[A-Za-z0-9]+$/

  #repository
  #runner
  #clock
  #options
  #name
  #cases
  #prepared = null
  #results = null

  static pieces(cases) {
    // A question case and a task case never share an invocation: the task's
    // write grants would reach the question and change what it does.
    const questions = cases.filter(({ family }) =>
      family === PluginEvalRun.#QUESTION)
    const tasks = cases.filter(({ family }) =>
      family !== PluginEvalRun.#QUESTION)
    return Object.freeze([
      ...PluginEvalRun.#chunks(PluginEvalRun.#QUESTIONS, questions),
      ...PluginEvalRun.#chunks(PluginEvalRun.#TASKS, tasks)
    ].map((piece) => Object.freeze({
      name: piece.name,
      cases: Object.freeze([...piece.cases])
    })))
  }

  static #chunks(name, cases) {
    const groups = []
    for (let at = 0; at < cases.length; at += PluginEvalRun.#MAX_CASES) {
      groups.push(cases.slice(at, at + PluginEvalRun.#MAX_CASES))
    }
    // A piece holds at most six cases, so one run stays small and its cost
    // stays inside a single queue slot.
    return groups.map((group, index) => Object.freeze({
      name: groups.length === 1 ? name : `${name}-${index + 1}`,
      cases: group
    }))
  }

  constructor(repository, runner, clock, options, piece) {
    this.#repository = repository
    this.#runner = runner
    this.#clock = clock
    this.#options = options
    this.#name = piece.name
    this.#cases = piece.cases
  }

  get name() {
    return this.#name
  }

  get caseNames() {
    return this.#cases.map(({ name }) => name)
  }

  get resultsPath() {
    if (this.#results !== null) return this.#results
    return this.#prepared === null ? null : this.#prepared.outputDir
  }

  commandLine() {
    // The dry run prints exactly this line, so it shows the invocation a
    // queue slot would run without running anything.
    return [PluginEvalRun.#CLAUDE, ...this.command()].join(' ')
  }

  command() {
    return Object.freeze([...this.#prepare().args])
  }

  queueEntry() {
    // One queue slot carries the flags and only this piece's case names, so
    // the queue runs one small invocation rather than the whole suite.
    return Object.freeze({
      id: `eval-${this.#clock.now().getTime()}-${this.#name}`,
      label: `plugin-eval ${this.#name}`,
      script: 'scripts/eval-plugin.mjs',
      args: Object.freeze([
        '--only', this.caseNames.join(','),
        '--arm', this.#options.arm,
        '--model', this.#options.model,
        '--judge-model', this.#options.judgeModel,
        '--max-cost-usd', String(this.#options.maxCostUsd),
        '--runs', String(this.#options.runs)
      ])
    })
  }

  execute(report) {
    const prepared = this.#prepare()
    this.#results = prepared.outputDir
    try {
      mkdirSync(prepared.outputDir, { recursive: true })
      const { exitCode, output } = this.#runner.run(
        PluginEvalRun.#CLAUDE,
        [...prepared.args],
        prepared.cwd)
      const result = this.#result(prepared.resultFile)
      this.#accept(exitCode, result, output)
      const traces = this.#keepTraces(result, prepared.outputDir)
      this.#writeRun(result, prepared.outputDir)
      if (this.#options.arm === 'baseline') {
        this.#writeBaselines(result, prepared.copy)
      }
      report.note(`results: ${prepared.outputDir}`)
      report.note(
        `traces: ${traces.kept} of ${traces.total} kept in ` +
        join(prepared.outputDir, PluginEvalRun.#TRACES))
      // A partial run stopped at the cost ceiling, and its results are still
      // the record of what was measured before the ceiling.
      if (result.partial === true) {
        report.note(`partial: ${result.partialReason ?? 'no reason given'}`)
      }
    } finally {
      this.close()
    }
  }

  close() {
    if (this.#prepared === null) return
    // The plugin copy holds no result, and every kept trace is already out
    // of the scaffold, so both temporary folders go as soon as the run ends.
    this.#prepared.copy.close()
    rmSync(this.#prepared.cwd, { recursive: true, force: true })
    this.#prepared = null
  }

  #prepare() {
    if (this.#prepared !== null) return this.#prepared
    const cwd = mkdtempSync(join(tmpdir(), 'oo-eval-piece-'))
    let copy = null
    try {
      // The copy holds only this piece's cases, so the tool needs no --case
      // selection and cannot see a case that belongs to another piece.
      copy = PluginCopy.of(this.#repository)
      new EvalBuild(this.#repository, copy)
        .build({ arm: this.#options.arm, only: this.caseNames })
      const outputDir = join(
        this.#repository.root,
        PluginEvalRun.#RESULTS,
        this.#stamp(),
        this.#name)
      const resultFile = join(outputDir, PluginEvalRun.#RESULT)
      const args = [
        'plugin', 'eval', copy.path,
        '--eval-dir', 'evals',
        '--trust-plugin', '--no-publish', '--scaffold', '--keep-temp',
        '--json', resultFile,
        '--output-dir', outputDir,
        '--model', this.#options.model,
        '--judge-model', this.#options.judgeModel,
        '--max-cost-usd', String(this.#options.maxCostUsd),
        '--runs', String(this.#options.runs),
        '--ablation', this.#ablation()
      ]
      this.#prepared = {
        cwd,
        copy,
        outputDir,
        resultFile,
        args: Object.freeze(args)
      }
      return this.#prepared
    } catch (error) {
      if (copy !== null) copy.close()
      rmSync(cwd, { recursive: true, force: true })
      throw error
    }
  }

  #ablation() {
    // A block run needs only the arm with the block; a baseline run measures
    // the same cases with no plugin so a later block run can compare to it.
    return this.#options.arm === 'block' ? 'none' : 'with-without'
  }

  #stamp() {
    return this.#clock.now().toISOString().replace(/[:.]/g, '-')
  }

  #result(path) {
    // A graded run writes its document even when a case fails; no document
    // means the invocation broke before it measured anything.
    if (!existsSync(path)) {
      throw new RepoError(
        `claude plugin eval wrote no result at ${path}`, 2)
    }
    try {
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
      throw new RepoError(
        `claude plugin eval wrote unreadable JSON: ${error.message}`, 2)
    }
  }

  #accept(exitCode, result, output) {
    // Exit 0 and 1 are both graded runs; 1 only says a case scored below
    // the threshold. 2 is the cost ceiling and is graded only when the
    // document says it is partial.
    if (exitCode === 0 || exitCode === 1) return
    if (exitCode === 2 && result.partial === true) return
    const reason = output.trim().split('\n').find((line) => line !== '')
    throw new RepoError(
      `claude plugin eval exited ${exitCode}` +
      (reason === undefined ? '' : `: ${reason}`), 2)
  }

  #keepTraces(result, outputDir) {
    const rows = this.#caseRows(result)
    let kept = 0
    let total = 0
    for (const row of rows) {
      for (const [arm, runs] of Object.entries(row.arms ?? {})) {
        for (const [index, run] of (runs ?? []).entries()) {
          total += 1
          const source = run?.tracePath
          if (typeof source !== 'string') continue
          const target = join(
            outputDir,
            PluginEvalRun.#TRACES,
            row.name,
            `${arm}-${index + 1}.jsonl`)
          if (this.#copyTrace(source, target)) kept += 1
          // Only the scaffold named by this run's tracePath is removed; a
          // directory no trace names stays untouched.
          this.#removeScaffold(source)
        }
      }
    }
    return Object.freeze({ kept, total })
  }

  #caseRows(result) {
    if (!Array.isArray(result.cases) || result.cases.length === 0) {
      throw new RepoError(
        'the result document holds no case, so nothing was measured', 2)
    }
    return result.cases
  }

  #copyTrace(source, target) {
    if (!existsSync(source)) return false
    mkdirSync(dirname(target), { recursive: true })
    // The trace is copied out before its scaffold is removed; it is the only
    // record of what the agent opened during the run.
    copyFileSync(source, target)
    return true
  }

  #removeScaffold(tracePath) {
    // The tool names its scaffolds e-<id> and puts each trace under out/, so a
    // path that does not have that shape never names a directory to delete.
    if (!isAbsolute(tracePath) ||
      basename(tracePath) !== 'trace.jsonl' ||
      basename(dirname(tracePath)) !== 'out') {
      return
    }
    const scaffold = dirname(dirname(tracePath))
    if (!PluginEvalRun.#SCAFFOLD.test(basename(scaffold))) return
    if (!existsSync(scaffold)) return
    // The tool seals a kept scaffold read-only, with home/ and tmp/ at mode
    // 000, so every directory must be made writable before removal.
    this.#makeWritable(scaffold)
    rmSync(scaffold, { recursive: true, force: true })
  }

  #makeWritable(directory) {
    chmodSync(directory, 0o700)
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        this.#makeWritable(join(directory, entry.name))
      }
    }
  }

  #writeRun(result, outputDir) {
    if (typeof result.costUsd !== 'number') {
      throw new RepoError(
        'the result document holds no costUsd', 2)
    }
    mkdirSync(outputDir, { recursive: true })
    const record = {
      costUsd: result.costUsd,
      model: this.#options.model,
      judgeModel: this.#options.judgeModel,
      commit: this.#commit(),
      dirty: this.#dirty(),
      arm: this.#options.arm,
      cases: this.caseNames
    }
    writeFileSync(
      join(outputDir, PluginEvalRun.#RUN),
      `${JSON.stringify(record, null, 2)}\n`)
  }

  #commit() {
    const { exitCode, output } = this.#runner.run(
      'git', ['rev-parse', 'HEAD'], this.#repository.root)
    // A result without the checkout's HEAD cannot be reproduced.
    if (exitCode !== 0) {
      throw new RepoError(`cannot read HEAD: ${output.trim()}`, 2)
    }
    return output.trim()
  }

  #dirty() {
    const { exitCode, output } = this.#runner.run(
      'git', ['status', '--porcelain'], this.#repository.root)
    // Dirty means the checkout differs from the commit named beside it.
    if (exitCode !== 0) {
      throw new RepoError(`cannot read git status: ${output.trim()}`, 2)
    }
    return output.trim() !== ''
  }

  #writeBaselines(result, copy) {
    const rows = this.#caseRows(result)
    const directory = join(
      this.#repository.root,
      PluginEvalRun.#RESULTS,
      PluginEvalRun.#BASELINES,
      this.#options.model)
    mkdirSync(directory, { recursive: true })
    for (const row of rows) {
      const runs = row.arms?.without
      if (!Array.isArray(runs)) {
        throw new RepoError(
          `${row.name}: a baseline run has no without arm`, 2)
      }
      // The case hash keeps an edited case from reusing a stale baseline.
      const hash = this.#caseHash(copy, row.name)
      writeFileSync(
        join(directory, `${row.name}-${hash}.json`),
        `${JSON.stringify(runs, null, 2)}\n`)
    }
  }

  #caseHash(copy, name) {
    const path = join(copy.path, 'evals', name, 'case.yaml')
    return createHash('sha256')
      .update(readFileSync(path))
      .digest('hex')
      .slice(0, 12)
  }
}
