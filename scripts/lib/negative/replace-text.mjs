import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { RepoError } from '../errors.mjs'
import { TextFile } from '../text-file.mjs'
import { Mutation } from './mutation.mjs'

export class ReplaceText extends Mutation {
  #path
  #find
  #replace

  constructor(path, find, replace) {
    super()
    this.#path = path
    this.#find = find
    this.#replace = replace
    Object.freeze(this)
  }

  apply(root) {
    const file = TextFile.read(join(root, this.#path))
    if (!file.text.includes(this.#find)) {
      throw new RepoError(
        `Cannot find the text to replace in ${this.#path}`)
    }
    const updated = file.text.replace(this.#find, this.#replace)
    writeFileSync(join(root, this.#path), updated, 'utf8')
  }

  equals(other) {
    return other instanceof ReplaceText &&
      this.#path === other.#path &&
      this.#find === other.#find &&
      this.#replace === other.#replace
  }
}
