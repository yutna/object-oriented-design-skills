export class TaskCaseSkills {
  static #SKILL_GRADER = 'Skill'

  #graders

  constructor(taskCase) {
    this.#graders = taskCase.graders
    Object.freeze(this)
  }

  names(skillName) {
    // Only a Skill grader says which loaded skill the case scored, and
    // the name counts only as a whole name.
    return this.#graders.some((grader) =>
      grader.tool === TaskCaseSkills.#SKILL_GRADER &&
      TaskCaseSkills.#namesAsWhole(grader.input_match, skillName))
  }

  static #namesAsWhole(inputMatch, skillName) {
    if (typeof inputMatch !== 'string') return false
    const escaped = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
      `(?<![\\w-])${escaped}(?![\\w-])`).test(inputMatch)
  }
}
