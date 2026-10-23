import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { Check } from '../check.mjs'
import { RepoError } from '../errors.mjs'
import { RunGrade } from './run-grade.mjs'

export class EvalSummary extends Check {
  static #RESULT = 'result.json'
  static #RUN = 'run.json'
  static #SUMMARY = 'summary.json'
  static #BASELINES = 'baselines'
  static #TRACES = 'traces'
  static #HASHED = /^(.+)-[0-9a-f]{12}\.json$/
  static #FAMILIES = Object.freeze({
    q: 'question',
    t: 'task',
    r: 'restraint',
    p: 'precedence'
  })

  #directory
  #summary = null

  constructor(directory) {
    super()
    // A missing argument is refused when the check runs, so only Cli turns
    // it into an exit code.
    this.#directory = typeof directory === 'string' && directory !== ''
      ? resolve(directory)
      : null
    Object.freeze(this)
  }

  get name() {
    return 'eval-summary'
  }

  get directory() {
    return this.#directory
  }

  summary() {
    if (this.#directory === null) {
      throw new RepoError(
        'usage: eval-summary.mjs <results dir>', 2)
    }
    if (this.#summary === null) this.#summary = this.#build()
    return this.#summary
  }

  inspect(report) {
    const summary = this.summary()
    for (const line of this.#lines(summary)) report.note(line)
    // One piece with no graded run is a failed measurement even when another
    // piece beside it measured something.
    for (const piece of summary.pieces) {
      if (piece.graded === 0) {
        report.error(`piece ${piece.path}`, 'has no graded run')
      }
    }
    for (const [arm, names] of Object.entries(summary.losses)) {
      for (const name of names) {
        report.note(
          `lost ${name} on ${arm}; rerun before changing anything`)
      }
    }
    this.#write(summary)
    report.count('graded run(s)', summary.gradedRuns)
  }

  #build() {
    const pieces = this.#pieces()
    const models = new Set(pieces.map((piece) => piece.model)
      .filter((model) => model !== null))
    const baselines = this.#baselines(models)
    const cases = new Map()
    for (const piece of pieces) {
      const result = this.#json(piece.resultPath)
      if (!Array.isArray(result.cases)) {
        throw new RepoError(
          `${piece.path}: result.json holds no cases`, 2)
      }
      piece.graded = this.#pieceRuns(
        piece, result.cases, baselines, cases)
    }
    for (const baseline of baselines.values()) {
      // The baseline folder accumulates every case; only a case in this
      // results folder has a block run to compare against it.
      if (!cases.has(baseline.case)) continue
      const entry = this.#entry(
        cases, baseline.case, this.#familyOfName(baseline.case))
      for (const run of baseline.runs) {
        this.#record(entry, 'none', new RunGrade(run))
      }
    }
    const graded = {}
    for (const [name, entry] of cases) {
      graded[name] = this.#finalize(entry)
    }
    const { wins, losses } = this.#compare(graded)
    const gradedRuns = Object.values(graded).reduce(
      (sum, entry) => sum + Object.values(entry.arms)
        .reduce((count, arm) => count + arm.graded, 0), 0)
    return Object.freeze({
      schemaVersion: 1,
      gradedRuns,
      cases: Object.freeze(graded),
      families: Object.freeze(this.#families(graded)),
      wins: Object.freeze(wins),
      losses: Object.freeze(losses),
      pieces: Object.freeze(pieces.map((piece) => Object.freeze({
        path: piece.path,
        arm: piece.arm,
        graded: piece.graded
      })))
    })
  }

  #pieces() {
    if (!existsSync(this.#directory)) {
      throw new RepoError(
        `cannot read results: ${this.#directory}`, 2)
    }
    const pieces = []
    for (const resultPath of this.#resultFiles(this.#directory)) {
      const directory = dirname(resultPath)
      const record = this.#runRecord(directory)
      pieces.push({
        path: relative(this.#directory, directory) || '.',
        directory,
        resultPath,
        arm: typeof record.arm === 'string' ? record.arm : 'block',
        model: typeof record.model === 'string' ? record.model : null,
        families: record.families ?? {},
        graded: 0
      })
    }
    return pieces
  }

  #resultFiles(directory) {
    const files = []
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        // Stored baselines are read apart and traces are not pieces.
        if (entry.name === EvalSummary.#BASELINES ||
          entry.name === EvalSummary.#TRACES) continue
        files.push(...this.#resultFiles(path))
        continue
      }
      if (entry.name === EvalSummary.#RESULT) files.push(path)
    }
    return files.sort()
  }

  #runRecord(directory) {
    const path = join(directory, EvalSummary.#RUN)
    if (!existsSync(path)) return {}
    return this.#json(path)
  }

  #pieceRuns(piece, rows, baselines, cases) {
    let graded = 0
    for (const row of rows) {
      const entry = this.#entry(
        cases, row.name,
        this.#familyOf(row, piece))
      for (const [arm, runs] of Object.entries(row.arms ?? {})) {
        const condition = EvalSummary.#condition(piece.arm, arm)
        // A stored baseline already holds these runs; counting both would
        // measure the same no-pack answers twice.
        if (condition === 'none' &&
          this.#hasBaseline(baselines, piece.model, row.name)) continue
        for (const [index, run] of (runs ?? []).entries()) {
          const trace = this.#trace(piece, row.name, arm, index)
          const grade = new RunGrade(run, trace)
          if (grade.state === 'graded') graded += 1
          this.#record(entry, condition, grade)
        }
      }
    }
    return graded
  }

  static #condition(pieceArm, resultArm) {
    if (resultArm === 'without') return 'none'
    if (resultArm !== 'with') return resultArm
    return pieceArm
  }

  #trace(piece, name, arm, index) {
    const path = join(
      piece.directory,
      EvalSummary.#TRACES,
      name,
      `${arm}-${index + 1}.jsonl`)
    if (!existsSync(path)) return ''
    return readFileSync(path, 'utf8')
  }

  #baselines(models) {
    const directory = this.#baselineDirectory()
    const chosen = new Map()
    if (directory === null) return chosen
    for (const entry of readdirSync(
      directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (models.size > 0 && !models.has(entry.name)) continue
      const modelDirectory = join(directory, entry.name)
      for (const file of readdirSync(modelDirectory)) {
        const named = EvalSummary.#HASHED.exec(file)
        if (named === null) continue
        const path = join(modelDirectory, file)
        const key = `${entry.name}\0${named[1]}`
        const previous = chosen.get(key)
        // An edited case gets a new hash; only the newest file can belong to
        // the case as it stands now.
        const mtime = statSync(path).mtimeMs
        if (previous === undefined || mtime > previous.mtime) {
          chosen.set(key, {
            model: entry.name,
            case: named[1],
            path,
            mtime
          })
        }
      }
    }
    const baselines = new Map()
    for (const [key, baseline] of chosen) {
      const parsed = this.#json(baseline.path)
      const runs = Array.isArray(parsed) ? parsed : parsed.runs
      if (!Array.isArray(runs)) {
        throw new RepoError(
          `baseline ${baseline.path} holds no runs`, 2)
      }
      baselines.set(key, Object.freeze({
        model: baseline.model,
        case: baseline.case,
        runs: Object.freeze(runs)
      }))
    }
    return baselines
  }

  #baselineDirectory() {
    const beside = join(this.#directory, EvalSummary.#BASELINES)
    if (existsSync(beside)) return beside
    // A summary is usually run on one timestamp folder, with baselines kept
    // one level up beside the other timestamps.
    const above = join(
      dirname(this.#directory), EvalSummary.#BASELINES)
    return existsSync(above) ? above : null
  }

  #hasBaseline(baselines, model, name) {
    if (model !== null) return baselines.has(`${model}\0${name}`)
    for (const key of baselines.keys()) {
      if (key.endsWith(`\0${name}`)) return true
    }
    return false
  }

  #familyOf(row, piece) {
    if (typeof row.family === 'string') return row.family
    if (typeof piece.families[row.name] === 'string') {
      return piece.families[row.name]
    }
    return this.#familyOfName(row.name)
  }

  #familyOfName(name) {
    // Case names carry their family as their first letter, which is the
    // only family record a result row keeps.
    const family = EvalSummary.#FAMILIES[name.slice(0, 1)]
    return family ?? 'other'
  }

  #entry(cases, name, family) {
    if (!cases.has(name)) {
      cases.set(name, Object.freeze({ family, arms: new Map() }))
    }
    return cases.get(name)
  }

  #record(entry, arm, grade) {
    if (!entry.arms.has(arm)) {
      entry.arms.set(arm, {
        graded: 0,
        passed: 0,
        errored: 0,
        unjudged: 0,
        failed: new Set(),
        skills: new Set(),
        files: new Set(),
        runs: []
      })
    }
    const bucket = entry.arms.get(arm)
    if (grade.state === 'graded') {
      bucket.graded += 1
      if (grade.passed) bucket.passed += 1
      for (const name of grade.failedGraders) bucket.failed.add(name)
    } else if (grade.state === 'errored') {
      bucket.errored += 1
    } else {
      bucket.unjudged += 1
    }
    for (const skill of grade.skillsLoaded) bucket.skills.add(skill)
    for (const skill of grade.skillFilesRead) bucket.files.add(skill)
    bucket.runs.push(Object.freeze({
      state: grade.state,
      passed: grade.passed,
      failedGraders: grade.failedGraders,
      skillsLoaded: grade.skillsLoaded,
      skillFilesRead: grade.skillFilesRead
    }))
  }

  #finalize(entry) {
    const arms = {}
    for (const [arm, bucket] of [...entry.arms].sort(
      ([left], [right]) => left.localeCompare(right))) {
      arms[arm] = Object.freeze({
        graded: bucket.graded,
        passed: bucket.passed,
        errored: bucket.errored,
        unjudged: bucket.unjudged,
        failedGraders: Object.freeze([...bucket.failed].sort()),
        skillsLoaded: Object.freeze([...bucket.skills].sort()),
        skillFilesRead: Object.freeze([...bucket.files].sort()),
        runs: Object.freeze(bucket.runs)
      })
    }
    return Object.freeze({
      family: entry.family,
      arms: Object.freeze(arms)
    })
  }

  #families(cases) {
    const counts = new Map()
    for (const entry of Object.values(cases)) {
      for (const [arm, bucket] of Object.entries(entry.arms)) {
        if (!counts.has(entry.family)) counts.set(entry.family, new Map())
        const arms = counts.get(entry.family)
        if (!arms.has(arm)) arms.set(arm, { graded: 0, passed: 0 })
        const total = arms.get(arm)
        total.graded += bucket.graded
        total.passed += bucket.passed
      }
    }
    const families = {}
    for (const family of [...counts.keys()].sort()) {
      families[family] = {}
      for (const [arm, total] of [...counts.get(family)].sort(
        ([left], [right]) => left.localeCompare(right))) {
        families[family][arm] = Object.freeze({
          graded: total.graded,
          passed: total.passed,
          rate: total.graded === 0 ? null : total.passed / total.graded
        })
      }
      Object.freeze(families[family])
    }
    return families
  }

  #compare(cases) {
    const wins = {}
    const losses = {}
    for (const entry of Object.values(cases)) {
      for (const arm of Object.keys(entry.arms)) {
        if (arm === 'none') continue
        if (wins[arm] === undefined) wins[arm] = []
        if (losses[arm] === undefined) losses[arm] = []
      }
    }
    for (const [name, entry] of Object.entries(cases)) {
      const baseline = entry.arms.none
      // A case with no graded baseline is neither won nor lost.
      if (baseline === undefined || baseline.graded === 0) continue
      for (const [arm, counts] of Object.entries(entry.arms)) {
        if (arm === 'none' || counts.graded === 0) continue
        // Compare rates, not raw counts, so unequal run counts cannot crown
        // the arm that simply ran more often.
        const left = counts.passed * baseline.graded
        const right = baseline.passed * counts.graded
        if (left > right) wins[arm].push(name)
        else if (left < right) losses[arm].push(name)
      }
    }
    for (const [arm, names] of Object.entries(wins)) {
      wins[arm] = Object.freeze([...names].sort())
    }
    for (const [arm, names] of Object.entries(losses)) {
      losses[arm] = Object.freeze([...names].sort())
    }
    return { wins, losses }
  }

  #lines(summary) {
    const rows = []
    for (const [name, entry] of Object.entries(summary.cases)) {
      for (const [arm, counts] of Object.entries(entry.arms)) {
        rows.push([
          name,
          arm,
          counts.graded,
          counts.passed,
          counts.errored,
          counts.unjudged,
          counts.failedGraders.join(', ') || '-'
        ])
      }
    }
    const headers = Object.freeze([
      'case', 'arm', 'graded', 'passed', 'errored', 'unjudged', 'failed'])
    const widths = headers.map((header, column) => Math.max(
      header.length,
      ...rows.map((row) => String(row[column]).length)))
    const table = [
      EvalSummary.#row(headers, widths),
      EvalSummary.#row(widths.map((width) => '-'.repeat(width)), widths),
      ...rows.map((row) => EvalSummary.#row(row, widths))
    ]
    const opened = []
    for (const [name, entry] of Object.entries(summary.cases)) {
      for (const [arm, counts] of Object.entries(entry.arms)) {
        const used = EvalSummary.#opened(counts)
        if (used !== null) opened.push(`${name} ${arm}: ${used}`)
      }
    }
    const lines = [...table]
    if (opened.length > 0) lines.push('', ...opened)
    lines.push('', 'family pass rate')
    for (const [family, arms] of Object.entries(summary.families)) {
      for (const [arm, counts] of Object.entries(arms)) {
        lines.push(
          `${family} ${arm} ${EvalSummary.#rate(counts)}`)
      }
    }
    lines.push('', 'against stored baselines')
    for (const [arm, names] of Object.entries(summary.wins)) {
      lines.push(`wins ${arm}: ${names.join(', ') || 'none'}`)
    }
    for (const [arm, names] of Object.entries(summary.losses)) {
      lines.push(`losses ${arm}: ${names.join(', ') || 'none'}`)
    }
    return lines
  }

  static #row(values, widths) {
    return values.map((value, column) =>
      String(value).padEnd(widths[column])).join('  ').trimEnd()
  }

  static #rate(counts) {
    if (counts.graded === 0) return '0/0 (n/a)'
    return `${counts.passed}/${counts.graded} ` +
      `(${Math.round(counts.rate * 100)}%)`
  }

  static #opened(counts) {
    const skills = counts.skillsLoaded
    const files = counts.skillFilesRead
    if (skills.length === 0 && files.length === 0) return null
    const parts = []
    if (skills.length > 0) parts.push(`Skill ${skills.join(', ')}`)
    if (files.length > 0) parts.push(`Read ${files.join(', ')}`)
    return parts.join('; ')
  }

  #write(summary) {
    const path = join(this.#directory, EvalSummary.#SUMMARY)
    try {
      mkdirSync(this.#directory, { recursive: true })
      writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`)
    } catch (error) {
      throw new RepoError(
        `cannot write ${path}: ${error.message}`, 2)
    }
  }

  #json(path) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
      throw new RepoError(
        `cannot read ${path}: ${error.message}`, 2)
    }
  }
}
