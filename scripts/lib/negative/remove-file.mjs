import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { Mutation } from './mutation.mjs'

export class RemoveFile extends Mutation {
  #path

  constructor(path) {
    super()
    this.#path = path
    Object.freeze(this)
  }

  apply(root) {
    rmSync(join(root, this.#path))
  }

  equals(other) {
    return other instanceof RemoveFile &&
      this.#path === other.#path
  }
}
