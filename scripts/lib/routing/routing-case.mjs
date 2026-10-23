export class RoutingCase {
  #symptom
  #expected

  constructor(symptom, expected) {
    this.#symptom = symptom
    this.#expected = expected
    Object.freeze(this)
  }

  get symptom() {
    return this.#symptom
  }

  get expected() {
    return this.#expected
  }

  equals(other) {
    // Two cases are equal when they name the same symptom and skill.
    return other instanceof RoutingCase &&
      other.#symptom === this.#symptom &&
      other.#expected === this.#expected
  }
}
