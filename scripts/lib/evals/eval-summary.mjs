import { Check } from '../check.mjs'

export class EvalSummary extends Check {
  #directory

  constructor(directory) {
    super()
    this.#directory = directory
    Object.freeze(this)
  }

  get name() {
    return 'eval-summary'
  }

  get directory() {
    return this.#directory
  }

  summary() {
    return {
      gradedRuns: 0,
      cases: {},
      families: {},
      wins: {},
      losses: {}
    }
  }

  inspect(report) {
    report.count('graded run(s)', 0)
  }
}
