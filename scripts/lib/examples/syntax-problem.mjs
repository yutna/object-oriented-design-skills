export class SyntaxProblem {
  #row
  #column
  #message

  constructor(row, column, message) {
    this.#row = row
    this.#column = column
    this.#message = message
    Object.freeze(this)
  }

  get row() {
    return this.#row
  }

  get column() {
    return this.#column
  }

  get message() {
    return this.#message
  }

  equals(other) {
    return other instanceof SyntaxProblem &&
      this.#row === other.row &&
      this.#column === other.column &&
      this.#message === other.message
  }
}
