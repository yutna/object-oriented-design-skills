import { Check } from '../check.mjs'

export class ScenariosCheck extends Check {
  constructor(repository) {
    super()
    Object.freeze(this)
  }

  get name() {
    return 'scenarios'
  }

  inspect(report) {
  }
}
