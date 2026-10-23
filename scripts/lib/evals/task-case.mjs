import { isDeepStrictEqual } from 'node:util'

export class TaskCase {
  #name
  #fileName
  #schemaVersion
  #tags
  #scaffold
  #allowedTools
  #graders

  constructor(name, fileName, schemaVersion, tags, scaffold,
    allowedTools, graders) {
    this.#name = name
    this.#fileName = fileName
    this.#schemaVersion = schemaVersion
    this.#tags = Object.freeze([...(tags ?? [])])
    this.#scaffold = scaffold
    this.#allowedTools = Object.freeze([...(allowedTools ?? [])])
    this.#graders = Object.freeze((graders ?? []).map((grader) =>
      Object.freeze({ ...grader })))
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }

  get fileName() {
    return this.#fileName
  }

  get schemaVersion() {
    return this.#schemaVersion
  }

  get tags() {
    return this.#tags
  }

  get scaffold() {
    return this.#scaffold
  }

  get allowedTools() {
    return this.#allowedTools
  }

  get graders() {
    return this.#graders
  }

  equals(other) {
    // Two cases are equal when every field matches by value.
    return other instanceof TaskCase &&
      other.#name === this.#name &&
      other.#fileName === this.#fileName &&
      other.#schemaVersion === this.#schemaVersion &&
      isDeepStrictEqual(other.#tags, this.#tags) &&
      other.#scaffold === this.#scaffold &&
      isDeepStrictEqual(other.#allowedTools, this.#allowedTools) &&
      isDeepStrictEqual(other.#graders, this.#graders)
  }
}
