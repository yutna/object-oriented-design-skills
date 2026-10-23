import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Check } from '../check.mjs'
import { QueueGateError, RepoError } from '../errors.mjs'
import { RoutingCases } from '../routing/routing-cases.mjs'
import { PluginCopy } from './plugin-copy.mjs'

export class ModelRouting extends Check {
  static #MODEL = 'claude-haiku-5-5'
  static #PLUGIN = 'object-oriented-design-skills'
  static #PROMPT = 'Which of your skills fits this request best? ' +
    'Reply with its name only, or none.'
  static #ROUTING = 'evals/routing-cases.md'
  static #RESULTS = 'evals/results'
  static #ANSWER = /(?:[\w-]+:)?oo-[a-z0-9-]+/
  static #PREFIX = /^[\w-]+:/

  #repository
  #argv
  #runner
  #environment

  constructor(repository, argv, runner, environment) {
    super()
    this.#repository = repository
    this.#argv = Object.freeze([...argv])
    this.#runner = runner
    this.#environment = environment
    Object.freeze(this)
  }

  get name() {
    return 'eval-route-model'
  }

  inspect(report) {
    const dryRun = this.#argv.includes('--dry-run')
    const selftest = this.#argv.includes('--selftest')
    // A real run spends quota, so it only starts from inside the queue.
    if (!dryRun && !selftest &&
      this.#environment.OO_EVAL_QUEUE !== '1') {
      throw new QueueGateError()
    }
    const cases = RoutingCases.of(
      this.#repository.file(ModelRouting.#ROUTING))
    const copy = PluginCopy.of(this.#repository)
    try {
      if (dryRun) {
        // A dry run shows the exact command without starting a session.
        for (const routingCase of cases) {
          report.note(ModelRouting.#command(
            copy.path,
            routingCase.symptom))
        }
        report.count('routed case(s)', cases.length)
        return
      }
      const skills = copy.skills()
      const results = []
      for (const routingCase of cases) {
        const output = this.#run(copy.path, routingCase)
        ModelRouting.#requireListing(output, skills)
        results.push({
          symptom: routingCase.symptom,
          expected: routingCase.expected,
          answer: ModelRouting.#answer(output),
          output
        })
      }
      const hits = results.filter((result) =>
        result.answer === result.expected).length
      report.note(`top-1: ${hits}/${results.length}`)
      for (const result of results.filter((entry) =>
        entry.answer !== entry.expected)) {
        // A miss is a measurement, not a failed check.
        report.note(
          `miss: ${result.symptom} -> expected ${result.expected}, ` +
          `answered ${result.answer}`)
      }
      this.#write(results, hits)
      report.count('routed case(s)', results.length)
    } finally {
      copy.close()
    }
  }

  #run(copyPath, routingCase) {
    // A fresh folder keeps one case from reading another case's files.
    const directory = mkdtempSync(join(tmpdir(), 'oo-route-model-'))
    try {
      const { exitCode, output } = this.#runner.run(
        'claude',
        ModelRouting.#args(copyPath, routingCase.symptom),
        directory)
      // A run that exits non-zero leaves no answer worth measuring.
      if (exitCode !== 0) {
        throw new RepoError(
          `route run failed: exit ${exitCode}: ${output.trim()}`)
      }
      return output
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  #write(results, hits) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const directory = join(
      this.#repository.root,
      ModelRouting.#RESULTS,
      `${stamp}-route`)
    mkdirSync(directory, { recursive: true })
    const answers = results.map((result, index) => {
      const stream = `case-${index + 1}.jsonl`
      // The raw stream is kept beside the answer so a miss can be read.
      writeFileSync(join(directory, stream), result.output)
      return {
        symptom: result.symptom,
        expected: result.expected,
        answer: result.answer,
        stream
      }
    })
    writeFileSync(join(directory, 'answers.json'), `${JSON.stringify({
      model: ModelRouting.#MODEL,
      top1: hits,
      cases: results.length,
      results: answers
    }, null, 2)}\n`)
  }

  static #args(copyPath, symptom) {
    const prompt = `${symptom}\n\n${ModelRouting.#PROMPT}`
    return [
      '-p',
      '--model', ModelRouting.#MODEL,
      '--setting-sources', '',
      '--plugin-dir', copyPath,
      '--tools', 'Skill',
      '--max-turns', '1',
      '--output-format', 'stream-json',
      '--verbose',
      prompt
    ]
  }

  static #command(copyPath, symptom) {
    return ['claude', ...ModelRouting.#args(copyPath, symptom)]
      .map((argument) => ModelRouting.#display(argument))
      .join(' ')
  }

  static #display(argument) {
    if (argument === '') return '""'
    if (/^[\w./:=@-]+$/.test(argument)) return argument
    return JSON.stringify(argument)
  }

  static #events(output) {
    const events = []
    for (const line of output.split('\n')) {
      if (line.trim() === '') continue
      try {
        events.push(JSON.parse(line))
      } catch {
        continue
      }
    }
    return events
  }

  static #requireListing(output, skills) {
    // A copy with no skills cannot prove the pack was loaded.
    if (skills.length === 0) {
      throw new RepoError('plugin copy lists no skills')
    }
    const init = ModelRouting.#events(output).find((event) =>
      event?.type === 'system' && event?.subtype === 'init')
    const listed = Array.isArray(init?.skills) ? init.skills : []
    for (const skill of skills) {
      const required = `${ModelRouting.#PLUGIN}:${skill}`
      // Without the listing the session never saw the pack.
      if (!listed.includes(required)) {
        throw new RepoError(`run has no skill listing for ${required}`)
      }
    }
  }

  static #answer(output) {
    const events = ModelRouting.#events(output)
    for (const event of events) {
      if (event?.type !== 'assistant') continue
      for (const part of event.message?.content ?? []) {
        if (part.type === 'tool_use' && part.name === 'Skill' &&
          typeof part.input?.skill === 'string') {
          return ModelRouting.#withoutPlugin(part.input.skill)
        }
      }
    }
    const result = events
      .filter((event) => event?.type === 'result').at(-1)
    const text = typeof result?.result === 'string' ? result.result : ''
    const match = text.match(ModelRouting.#ANSWER)
    // A session that named no skill answered none.
    return match === null
      ? 'none'
      : ModelRouting.#withoutPlugin(match[0])
  }

  static #withoutPlugin(answer) {
    // The plugin prefix belongs to the harness, not the skill name.
    return answer.replace(ModelRouting.#PREFIX, '')
  }
}
