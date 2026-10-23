import { Check } from '../check.mjs'

export class ListingBudgetCheck extends Check {
  // A ceiling only ever comes down: Claude Code drops descriptions at its cap.
  static CEILINGS = Object.freeze(new Map([
    ['object-oriented-design-skills', 8000]
  ]))

  static #DEFAULT_CEILING = 1200

  #repository
  #ceilings

  constructor(repository, ceilings = ListingBudgetCheck.CEILINGS) {
    super()
    this.#repository = repository
    this.#ceilings = ceilings
    Object.freeze(this)
  }

  get name() {
    return 'listing-budget'
  }

  inspect(report) {
    const plugins = this.#repository.marketplace().plugins()
    report.count('listing(s)', plugins.length)

    for (const plugin of plugins) {
      const sum = plugin.skills().reduce(
        (total, skill) => total +
          this.#length(skill.name) +
          this.#length(skill.description),
        0)
      const ceiling = this.#ceilings.get(plugin.name) ??
        ListingBudgetCheck.#DEFAULT_CEILING
      // Past its ceiling, Claude Code drops descriptions from the listing.
      if (sum > ceiling) {
        report.error(
          plugin.directory,
          `plugin ${plugin.name} listing is ${sum} characters, over ` +
          `its ${ceiling}-character ceiling`)
      }
    }
  }

  #length(value) {
    return typeof value === 'string' ? value.length : 0
  }
}
