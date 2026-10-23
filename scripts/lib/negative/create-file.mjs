import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { Mutation } from './mutation.mjs'

export class CreateFile extends Mutation {
  #path
  #text

  constructor(path, text) {
    super()
    this.#path = path
    this.#text = text
    Object.freeze(this)
  }

  apply(root) {
    const path = join(root, this.#path)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, this.#text, 'utf8')
  }

  equals(other) {
    return other instanceof CreateFile &&
      this.#path === other.#path &&
      this.#text === other.#text
  }
}
