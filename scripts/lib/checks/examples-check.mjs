import { Check } from '../check.mjs'

export class ExamplesCheck extends Check {
  #repository
  #syntaxes

  constructor(repository, syntaxes) {
    super()
    this.#repository = repository
    this.#syntaxes = syntaxes
    Object.freeze(this)
  }

  get name() {
    return 'examples'
  }

  async inspect(report) {
    void this.#repository
    void this.#syntaxes
    void report
  }
}
