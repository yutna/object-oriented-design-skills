export class Heading {
  #level
  #text
  #line
  #slug

  constructor(level, text, line, slug) {
    this.#level = level
    this.#text = text
    this.#line = line
    this.#slug = slug
    Object.freeze(this)
  }

  get level() {
    return this.#level
  }

  get text() {
    return this.#text
  }

  get line() {
    return this.#line
  }

  get slug() {
    return this.#slug
  }

  equals(other) {
    return other instanceof Heading &&
      this.#level === other.level &&
      this.#text === other.text &&
      this.#line === other.line &&
      this.#slug === other.slug
  }
}
