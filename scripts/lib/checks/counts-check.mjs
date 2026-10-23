import { Check } from '../check.mjs'

export class CountsCheck extends Check {
  constructor(repository) {
    super()
    Object.freeze(this)
  }

  get name() {
    return 'counts'
  }

  inspect(report) {
  }
}
