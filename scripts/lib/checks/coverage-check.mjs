import { Check } from '../check.mjs'
import { Scenarios } from '../evals/scenarios.mjs'
import { TaskCaseSkills } from '../evals/task-case-skills.mjs'
import { TaskCases } from '../evals/task-cases.mjs'
import { RoutingCases } from '../routing/routing-cases.mjs'

export class CoverageCheck extends Check {
  static MIN_ROUTING_CASES = 2
  static MIN_SCENARIOS = 1
  static MIN_TASK_CASES = 1

  static #PLUGIN = 'object-oriented-design-skills'
  static #ROUTING = 'evals/routing-cases.md'
  static #SCENARIOS = 'evals/scenarios.md'
  static #TASKS = 'evals/tasks'

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
    const taskCases = TaskCases.of(this.#repository)
      .map((taskCase) => new TaskCaseSkills(taskCase))
    let covered = 0
    for (const skill of skills) {
      const coreSkill = core.has(skill.path)
      // Two routing lines keep one skill reachable from two symptoms.
      const routingCount = routing.filter(({ expected }) =>
        expected === skill.name).length
      if (routingCount < CoverageCheck.MIN_ROUTING_CASES) {
        report.error(
          CoverageCheck.#ROUTING,
          `${skill.name} has ${routingCount} routing case(s); ` +
          `at least ${CoverageCheck.MIN_ROUTING_CASES}`)
      }
      // A core skill answers a whole clinic problem; a language skill
      // answers one language's question and needs a task case instead.
      const scenarioCount = coreSkill
        ? scenarios.filter((scenario) =>
          scenario.skills.includes(skill.name)).length
        : CoverageCheck.MIN_SCENARIOS
      if (coreSkill && scenarioCount < CoverageCheck.MIN_SCENARIOS) {
        report.error(
          CoverageCheck.#SCENARIOS,
          `${skill.name} has no scenario`)
      }
      // One task case proves that the skill's advice changes code.
      const taskCaseCount = coreSkill
        ? CoverageCheck.MIN_TASK_CASES
        : taskCases.filter((taskCase) =>
          taskCase.names(skill.name)).length
      if (!coreSkill &&
        taskCaseCount < CoverageCheck.MIN_TASK_CASES) {
        report.error(
          CoverageCheck.#TASKS,
          `${skill.name} has no task case in evals/tasks`)
      }
      if (routingCount >= CoverageCheck.MIN_ROUTING_CASES &&
        scenarioCount >= CoverageCheck.MIN_SCENARIOS &&
        taskCaseCount >= CoverageCheck.MIN_TASK_CASES) {
        covered += 1
      }
    }
    // A skill that meets every minimum that applies to it is covered.
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
