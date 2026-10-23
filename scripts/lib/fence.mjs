export class Fence {
  #language
  #body
  #startLine
  #endLine

  constructor(language, body, startLine, endLine) {
    this.#language = language
    this.#body = body
    this.#startLine = startLine
    this.#endLine = endLine
    Object.freeze(this)
  }

  get language() {
    return this.#language
  }

  get body() {
    return this.#body
  }

  get startLine() {
    return this.#startLine
  }

  get endLine() {
    return this.#endLine
  }

  equals(other) {
    return other instanceof Fence &&
      this.#language === other.language &&
      this.#body === other.body &&
      this.#startLine === other.startLine &&
      this.#endLine === other.endLine
  }
}
