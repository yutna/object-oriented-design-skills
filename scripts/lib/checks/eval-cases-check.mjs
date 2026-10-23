import { Check } from '../check.mjs'

export class EvalCasesCheck extends Check {
  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  #repository

  get name() {
    return 'eval-cases'
  }

  inspect() {
  }
}
