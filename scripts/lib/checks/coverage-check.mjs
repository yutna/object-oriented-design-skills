import { Check } from '../check.mjs'

export class CoverageCheck extends Check {
  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'coverage'
  }

  inspect() {
  }
}
