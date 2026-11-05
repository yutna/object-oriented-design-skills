import { Check } from '../check.mjs'
import { Scenarios } from '../evals/scenarios.mjs'
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
  static #SKILL_GRADER = 'Skill'

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
          CoverageCheck.#namesSkill(taskCase, skill.name)).length
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

  static #namesSkill(taskCase, skillName) {
    // Only a Skill grader says which loaded skill the case scored, and
    // the name counts only as a whole name.
    return taskCase.graders.some((grader) =>
      grader.tool === CoverageCheck.#SKILL_GRADER &&
      CoverageCheck.#namesAsWhole(grader.input_match, skillName))
  }

  static #namesAsWhole(inputMatch, skillName) {
    if (typeof inputMatch !== 'string') return false
    const escaped = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
      `(?<![\\w-])${escaped}(?![\\w-])`).test(inputMatch)
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
