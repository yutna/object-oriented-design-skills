import { Check } from '../check.mjs'
import { Scenarios } from '../evals/scenarios.mjs'

export class ScenariosCheck extends Check {
  static #SCENARIOS = 'evals/scenarios.md'

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'scenarios'
  }

  inspect(report) {
    const scenarios = Scenarios.of(
      this.#repository.file(ScenariosCheck.#SCENARIOS))
    // A run that read no scenario is a failed measurement, not a clean pass.
    report.count('scenario(s)', scenarios.length)
    const names = new Set(
      this.#repository.skills().map(({ name }) => name))
    let expected = 1
    for (const scenario of scenarios) {
      // Scenario numbers must start at 1 and never skip or repeat.
      if (scenario.number !== expected) {
        report.error(
          ScenariosCheck.#SCENARIOS,
          'scenario numbering must start at 1 and run without ' +
          'gaps or repeats')
      }
      expected = scenario.number + 1
      this.#inspectScenario(scenario, names, report)
    }
  }

  #inspectScenario(scenario, names, report) {
    // A scenario without its prompt cannot be run.
    if (scenario.prompt.trim() === '') {
      report.error(
        ScenariosCheck.#SCENARIOS,
        `scenario ${scenario.number} must have a block-quote prompt`)
    }
    // A scenario without substance cannot be graded.
    if (scenario.mustContain.trim() === '') {
      report.error(
        ScenariosCheck.#SCENARIOS,
        `scenario ${scenario.number} must have a ` +
        '"Must contain:" paragraph')
    }
    // A scenario without a target cannot be routed.
    if (scenario.skills.length === 0) {
      report.error(
        ScenariosCheck.#SCENARIOS,
        `scenario ${scenario.number} must name a skill after ` +
        '"Should reach"')
    }
    for (const skill of scenario.skills) {
      // A target that no skill answers is a broken example.
      if (!names.has(skill)) {
        report.error(
          ScenariosCheck.#SCENARIOS,
          `scenario ${scenario.number} names unknown skill: ${skill}`)
      }
    }
    this.#inspectMustContain(scenario, report)
  }

  #inspectMustContain(scenario, report) {
    const paragraph = scenario.mustContain.trim()
    // An empty paragraph is a missing part, reported before this check.
    if (paragraph === '') return
    const breakIndex = this.#firstSentenceBreak(paragraph)
    if (breakIndex !== -1) {
      const after = paragraph.slice(breakIndex + 1).trim()
        .replace(/\s+/g, ' ')
      report.error(
        ScenariosCheck.#SCENARIOS,
        `scenario ${scenario.number} must hold points only in one ` +
        'sentence; text after the first full stop: ' +
        `"${after}"`)
      return
    }
    // A paragraph without its closing full stop is not one sentence.
    if (!this.#endsWithFullStop(paragraph)) {
      report.error(
        ScenariosCheck.#SCENARIOS,
        `scenario ${scenario.number} must end its "Must contain:" ` +
        'paragraph with a full stop')
    }
  }

  #firstSentenceBreak(paragraph) {
    let inCode = false
    for (let index = 0; index < paragraph.length; index += 1) {
      const character = paragraph[index]
      if (character === '`') {
        inCode = !inCode
        continue
      }
      if (inCode || character !== '.') continue
      const next = paragraph[index + 1]
      const previous = paragraph[index - 1] ?? ''
      // A full stop between two digits belongs to a number.
      if (/[0-9]/.test(previous) && /[0-9]/.test(next ?? '')) {
        continue
      }
      // Only a full stop followed by whitespace ends a sentence.
      if (next === undefined || !/\s/.test(next)) continue
      return index
    }
    return -1
  }

  #endsWithFullStop(paragraph) {
    if (!paragraph.endsWith('.')) return false
    let inCode = false
    for (const character of paragraph) {
      if (character === '`') inCode = !inCode
    }
    return !inCode
  }
}
