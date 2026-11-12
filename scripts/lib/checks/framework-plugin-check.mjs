import { basename, join } from 'node:path'

import { Check } from '../check.mjs'

export class FrameworkPluginCheck extends Check {
  static #CORE = 'object-oriented-design-skills'

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'framework-plugin'
  }

  inspect(report) {
    const plugins = this.#repository.marketplace()
      .plugins()
      .filter((plugin) => plugin.name !== FrameworkPluginCheck.#CORE)
    report.count('plugin(s)', plugins.length)
    for (const plugin of plugins) {
      const base = this.#baseOf(plugin, plugins)
      if (base === null) continue
      this.#inspectFrameworkPlugin(plugin, base, report)
    }
  }

  #baseOf(plugin, plugins) {
    const directory = basename(plugin.directory)
    return plugins
      .filter((candidate) => candidate !== plugin)
      .filter((candidate) => {
        const prefix = `${basename(candidate.directory)}-`
        return directory.startsWith(prefix) &&
          directory.length > prefix.length
      })
      .sort((left, right) =>
        basename(right.directory).length -
        basename(left.directory).length)[0] ?? null
  }

  #inspectFrameworkPlugin(plugin, base, report) {
    const family = basename(base.directory)
    const dependencies = [
      FrameworkPluginCheck.#CORE,
      `object-oriented-design-${family}`
    ]
    for (const dependency of dependencies) {
      // Installing a framework skill alone would load half the rules.
      if (plugin.dependencies.includes(dependency)) continue
      report.error(
        join(plugin.directory, '.claude-plugin', 'plugin.json'),
        `framework plugin ${plugin.name} must list dependency ${dependency}`)
    }
    const baseSkill = `oo-${family}`
    for (const skill of plugin.skills()) {
      const overview = skill.document.section('Overview')
      // The framework skill defers to its base skill, so it names it.
      if (overview !== null && overview.includes(`\`${baseSkill}\``)) {
        continue
      }
      report.error(
        skill.path,
        `Overview must name \`${baseSkill}\` in backticks`)
    }
  }
}
