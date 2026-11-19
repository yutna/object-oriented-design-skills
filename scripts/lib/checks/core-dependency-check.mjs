import { join } from 'node:path'

import { Check } from '../check.mjs'

export class CoreDependencyCheck extends Check {
  static #CORE = 'object-oriented-design-skills'

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'core-dependency'
  }

  inspect(report) {
    const plugins = this.#repository.marketplace()
      .plugins()
      .filter((plugin) => plugin.name !== CoreDependencyCheck.#CORE)
    report.count('plugin(s)', plugins.length)
    for (const plugin of plugins) {
      // A language skill names core rules, so it needs the core plugin.
      if (plugin.dependencies.includes(CoreDependencyCheck.#CORE)) {
        continue
      }
      report.error(
        join(plugin.directory, '.claude-plugin', 'plugin.json'),
        `plugin ${plugin.name} must list dependency ` +
        CoreDependencyCheck.#CORE)
    }
  }
}
