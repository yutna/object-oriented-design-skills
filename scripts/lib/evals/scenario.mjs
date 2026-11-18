export class Scenario {
  #number
  #title
  #prompt
  #mustContain
  #skills
  #smoke

  constructor(number, title, prompt, mustContain, skills, smoke = false) {
    this.#number = number
    this.#title = title
    this.#prompt = prompt
    this.#mustContain = mustContain
    this.#skills = Object.freeze([...skills])
    this.#smoke = smoke === true
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

  get smoke() {
    return this.#smoke
  }

  equals(other) {
    // Two scenarios are equal when every part matches by value.
    return other instanceof Scenario &&
      other.#number === this.#number &&
      other.#title === this.#title &&
      other.#prompt === this.#prompt &&
      other.#mustContain === this.#mustContain &&
      other.#smoke === this.#smoke &&
      other.#skills.length === this.#skills.length &&
      other.#skills.every((skill, index) => skill === this.#skills[index])
  }
}
