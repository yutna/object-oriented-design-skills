import { Check } from '../check.mjs'

export class PatternMentionCheck extends Check {
  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'pattern-mention'
  }

  inspect(report) {
    // Red-first stub: it reports nothing until the rules arrive.
  }
}
