import { Check } from '../check.mjs'
import { TaskCases } from '../evals/task-cases.mjs'

export class EvalCasesCheck extends Check {
  static #FAMILIES = Object.freeze([
    'task',
    'restraint',
    'precedence'
  ])
  static #SMOKE = 'smoke'
  static #SKILL = /oo-[a-z0-9-]+/g

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'eval-cases'
  }

  inspect(report) {
    const cases = TaskCases.of(this.#repository)
    // A run that read no task case is a failed measurement, not a clean pass.
    report.count('task case(s)', cases.length)
    const names = new Set(
      this.#repository.skills().map(({ name }) => name))
    for (const testCase of cases) {
      this.#inspectCase(testCase, names, report)
    }
  }

  #inspectCase(testCase, names, report) {
    const file = `evals/tasks/${testCase.fileName}`
    // The runner reads this schema version and no other.
    if (testCase.schemaVersion !== '1.1') {
      report.error(file, 'schema_version must be "1.1"')
    }
    // The file name is the case id the queue keys on.
    if (testCase.name !== testCase.fileName.slice(0, -'.yaml'.length)) {
      report.error(file, 'name must equal the file name without .yaml')
    }
    // One family tag drives the tier, and smoke only marks a quick case.
    const families = testCase.tags.filter((tag) =>
      EvalCasesCheck.#FAMILIES.includes(tag))
    const others = testCase.tags.filter((tag) =>
      tag !== EvalCasesCheck.#SMOKE &&
      !EvalCasesCheck.#FAMILIES.includes(tag))
    if (families.length !== 1 || others.length > 0) {
      report.error(
        file,
        'tags must hold exactly one family tag of ' +
        'task, restraint or precedence')
    }
    // The runner supplies the scaffold, so a case cannot point elsewhere.
    if (testCase.scaffold !== 'fixture.sh') {
      report.error(file, 'context.scaffold_script must be fixture.sh')
    }
    // A case that cannot use Skill cannot be routed.
    if (!testCase.allowedTools.includes('Skill')) {
      report.error(
        file,
        'execution.allowed_tools must include Skill')
    }
    for (const grader of testCase.graders) {
      this.#inspectGrader(grader, file, names, report)
    }
  }

  #inspectGrader(grader, file, names, report) {
    // A skill-use grader must say which loaded skill it scored.
    if (grader.tool === 'Skill' &&
      !String(grader.name ?? '').startsWith('loaded-')) {
      report.error(
        file,
        `Skill grader ${grader.name} must have a name starting loaded-`)
    }
    // A case that names a skill outside the pack cannot pass.
    if (typeof grader.input_match === 'string') {
      for (const skill of grader.input_match.match(EvalCasesCheck.#SKILL) ??
        []) {
        if (!names.has(skill)) {
          report.error(
            file,
            `unknown skill in input_match: ${skill}`)
        }
      }
    }
    // A Read grader must score only the arm that saw the skill.
    if (grader.tool === 'Read' && grader.arm !== 'with-only') {
      report.error(
        file,
        `Read grader ${grader.name} must set arm: with-only`)
    }
  }
}
