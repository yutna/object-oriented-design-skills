import { Check } from '../check.mjs'
import { Scenarios } from '../evals/scenarios.mjs'
import { RoutingCases } from '../routing/routing-cases.mjs'

export class CoverageCheck extends Check {
  static MIN_ROUTING_CASES = 2
  static MIN_SCENARIOS = 1

  static #PLUGIN = 'object-oriented-design-skills'
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
    const core = this.#corePaths()
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
      // A language skill answers no whole clinic problem, so it needs
      // no scenario; a core skill needs one.
      const scenarioCount = core.has(skill.path)
        ? scenarios.filter((scenario) =>
          scenario.skills.includes(skill.name)).length
        : CoverageCheck.MIN_SCENARIOS
      if (core.has(skill.path) &&
        scenarioCount < CoverageCheck.MIN_SCENARIOS) {
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

  #corePaths() {
    const plugin = this.#repository.marketplace()
      .plugins()
      .find((candidate) => candidate.name === CoverageCheck.#PLUGIN)
    return new Set(plugin === undefined
      ? []
      : plugin.skills().map((skill) => skill.path))
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
