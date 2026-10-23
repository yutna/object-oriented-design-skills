import { Scenarios } from '../evals/scenarios.mjs'
import { Fact } from './fact.mjs'

export class ScenarioCount extends Fact {
  constructor() {
    super()
    Object.freeze(this)
  }

  value(repository) {
    return Scenarios.of(repository.file('evals/scenarios.md')).length
  }

  equals(other) {
    return other instanceof ScenarioCount
  }
}
