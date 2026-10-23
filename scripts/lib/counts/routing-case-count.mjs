import { RoutingCases } from '../routing/routing-cases.mjs'
import { Fact } from './fact.mjs'

export class RoutingCaseCount extends Fact {
  constructor() {
    super()
    Object.freeze(this)
  }

  value(repository) {
    return RoutingCases.of(repository.file('evals/routing-cases.md')).length
  }

  equals(other) {
    return other instanceof RoutingCaseCount
  }
}
