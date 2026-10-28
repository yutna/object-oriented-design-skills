import { Check } from '../check.mjs'

export class PackScopeCheck extends Check {
  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'pack-scope'
  }

  inspect() {
    // Red first: the rules arrive in the next commit.
    void this.#repository
  }
}
