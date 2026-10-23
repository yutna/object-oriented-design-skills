import { Action } from './action.mjs'

export class Conflict extends Action {
  #pack

  constructor(pack) {
    super()
    this.#pack = pack
    Object.freeze(this)
  }

  apply(source, target, fileSystem, report, dryRun) {
    if (this.#pack === null) {
      report.error(
        target,
        'claims no pack; remove it first if this pack should own it')
      return
    }
    report.error(
      target,
      `belongs to ${this.#pack}; remove it first`)
  }
}
