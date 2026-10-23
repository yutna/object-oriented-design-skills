export class NegativeCase {
  #label
  #script
  #mutation
  #expected

  constructor(label, script, mutation, expected) {
    this.#label = label
    this.#script = script
    this.#mutation = mutation
    this.#expected = expected
    Object.freeze(this)
  }

  get label() {
    return this.#label
  }

  get script() {
    return this.#script
  }

  get mutation() {
    return this.#mutation
  }

  get expected() {
    return this.#expected
  }

  equals(other) {
    return other instanceof NegativeCase &&
      this.#label === other.#label &&
      this.#script === other.#script &&
      this.#expected === other.#expected &&
      this.#mutation.equals(other.#mutation)
  }
}
