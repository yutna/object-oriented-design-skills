export class CountClaim {
  #path
  #pattern
  #fact

  constructor(path, pattern, fact) {
    this.#path = path
    this.#pattern = pattern
    this.#fact = fact
    Object.freeze(this)
  }

  get path() {
    return this.#path
  }

  get pattern() {
    return this.#pattern
  }

  get fact() {
    return this.#fact
  }

  equals(other) {
    // Two claims are equal when they name the same sentence and fact.
    return other instanceof CountClaim &&
      other.#path === this.#path &&
      other.#pattern.source === this.#pattern.source &&
      other.#pattern.flags === this.#pattern.flags &&
      other.#fact.equals(this.#fact)
  }
}
