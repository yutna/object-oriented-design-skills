import { Check } from '../check.mjs'

export class LineLengthCheck extends Check {
  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'line-length'
  }

  inspect(report) {
    // Stub: the tests fail on their assertions until the check lands.
    report.count('markdown file(s)', 0)
  }
}
