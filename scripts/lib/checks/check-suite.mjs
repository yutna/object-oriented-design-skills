import { Check } from '../check.mjs'

export class CheckSuite extends Check {
  #name
  #checks

  constructor(name, checks) {
    super()
    this.#name = name
    this.#checks = Object.freeze([...checks])
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }

  async inspect(report) {
    for (const check of this.#checks) {
      await check.run(report)
    }
  }
}
