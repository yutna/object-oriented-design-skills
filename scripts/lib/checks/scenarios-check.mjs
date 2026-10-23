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
  }
}
