import { Fact } from './fact.mjs'

export class TaskCaseCount extends Fact {
  constructor() {
    super()
    Object.freeze(this)
  }

  value() {
    return 0
  }

  equals(other) {
    return other instanceof TaskCaseCount
  }
}
