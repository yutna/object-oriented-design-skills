import { Check } from '../check.mjs'
import { Scenarios } from '../evals/scenarios.mjs'
import { RoutingCases } from '../routing/routing-cases.mjs'

export class CoverageCheck extends Check {
  static MIN_ROUTING_CASES = 2
  static MIN_SCENARIOS = 1

  static #ROUTING = 'evals/routing-cases.md'
  static #SCENARIOS = 'evals/scenarios.md'

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'coverage'
  }

  inspect(report) {
    const skills = this.#repository.skills()
    const routing = this.#routing()
    const scenarios = this.#scenarios()
    let covered = 0
    for (const skill of skills) {
      // Two routing lines keep one skill reachable from two symptoms.
      const routingCount = routing.filter(({ expected }) =>
        expected === skill.name).length
      if (routingCount < CoverageCheck.MIN_ROUTING_CASES) {
        report.error(
          CoverageCheck.#ROUTING,
          `${skill.name} has ${routingCount} routing case(s); ` +
          `at least ${CoverageCheck.MIN_ROUTING_CASES}`)
      }
      // One scenario proves the skill answers a whole clinic problem.
      const scenarioCount = scenarios.filter((scenario) =>
        scenario.skills.includes(skill.name)).length
      if (scenarioCount < CoverageCheck.MIN_SCENARIOS) {
        report.error(
          CoverageCheck.#SCENARIOS,
          `${skill.name} has no scenario`)
      }
      if (routingCount >= CoverageCheck.MIN_ROUTING_CASES &&
        scenarioCount >= CoverageCheck.MIN_SCENARIOS) {
        covered += 1
      }
    }
    // A skill that meets both minimums is covered by the eval files.
    report.count('skill(s) covered', covered)
  }

  #routing() {
    const file = this.#repository.file(CoverageCheck.#ROUTING)
    return [
      ...RoutingCases.of(file),
      ...RoutingCases.knownMissesOf(file)
    ]
  }

  #scenarios() {
    return Scenarios.of(this.#repository.file(CoverageCheck.#SCENARIOS))
  }
}
