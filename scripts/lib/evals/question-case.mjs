export class QuestionCase {
  #scenario

  constructor(scenario) {
    this.#scenario = scenario
    Object.freeze(this)
  }

  get name() {
    return ''
  }

  get family() {
    return ''
  }

  get tags() {
    return Object.freeze([])
  }

  get prompt() {
    return ''
  }

  get appendSystemPrompt() {
    return ''
  }

  get allowedTools() {
    return Object.freeze([])
  }

  get graders() {
    return Object.freeze([])
  }

  document() {
    return {}
  }
}
