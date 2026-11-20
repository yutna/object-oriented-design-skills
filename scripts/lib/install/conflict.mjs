import { Action } from './action.mjs'

export class Conflict extends Action {
  #reason

  constructor(reason) {
    super()
    this.#reason = reason
    Object.freeze(this)
  }

  apply(source, target, fileSystem, report, dryRun) {
    report.error(target, this.#reason)
  }
}
