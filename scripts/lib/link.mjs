export class Link {
  #label
  #target
  #line

  constructor(label, target, line) {
    this.#label = label
    this.#target = target
    this.#line = line
    Object.freeze(this)
  }

  get label() {
    return this.#label
  }

  get target() {
    return this.#target
  }

  get line() {
    return this.#line
  }

  equals(other) {
    return other instanceof Link &&
      this.#label === other.label &&
      this.#target === other.target &&
      this.#line === other.line
  }
}
