export class Scenario {
  #number
  #title
  #prompt
  #mustContain
  #skills

  constructor(number, title, prompt, mustContain, skills) {
    this.#number = number
    this.#title = title
    this.#prompt = prompt
    this.#mustContain = mustContain
    this.#skills = Object.freeze([...skills])
    Object.freeze(this)
  }

  get number() {
    return this.#number
  }

  get title() {
    return this.#title
  }

  get prompt() {
    return this.#prompt
  }

  get mustContain() {
    return this.#mustContain
  }

  get skills() {
    return this.#skills
  }

  equals(other) {
    // Two scenarios are equal when every part matches by value.
    return other instanceof Scenario &&
      other.#number === this.#number &&
      other.#title === this.#title &&
      other.#prompt === this.#prompt &&
      other.#mustContain === this.#mustContain &&
      other.#skills.length === this.#skills.length &&
      other.#skills.every((skill, index) => skill === this.#skills[index])
  }
}
