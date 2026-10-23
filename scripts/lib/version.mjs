import { RepoError } from './errors.mjs'

export class Version {
  static #PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

  #text

  static parse(text) {
    if (typeof text !== 'string' || !Version.#PATTERN.test(text)) {
      throw new RepoError(`Invalid version: ${text}`)
    }
    return new Version(text)
  }

  constructor(text) {
    this.#text = text
    Object.freeze(this)
  }

  toString() {
    return this.#text
  }

  equals(other) {
    return other instanceof Version && other.#text === this.#text
  }
}
