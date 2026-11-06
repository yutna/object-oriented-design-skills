export class TaskCaseSkills {
  #taskCase

  constructor(taskCase) {
    this.#taskCase = taskCase
    Object.freeze(this)
  }

  names(skillName) {
    return false
  }
}
