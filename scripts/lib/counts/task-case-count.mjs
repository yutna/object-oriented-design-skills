import { TaskCases } from '../evals/task-cases.mjs'
import { Fact } from './fact.mjs'

export class TaskCaseCount extends Fact {
  constructor() {
    super()
    Object.freeze(this)
  }

  value(repository) {
    return TaskCases.of(repository).length
  }

  equals(other) {
    return other instanceof TaskCaseCount
  }
}
