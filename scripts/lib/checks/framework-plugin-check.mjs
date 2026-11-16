import { basename, join } from 'node:path'

import { Check } from '../check.mjs'

export class FrameworkPluginCheck extends Check {
  static #CORE = 'object-oriented-design-skills'

  static #PLATFORM_FAMILIES = Object.freeze({
    'web-components': Object.freeze(['javascript', 'typescript'])
  })

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
      const families = this.#baseFamiliesOf(plugin, plugins)
      if (families.length === 0) continue
      this.#inspectPlugin(plugin, families, report)
    }
  }

  #baseFamiliesOf(plugin, plugins) {
    const directory = basename(plugin.directory)
    if (Object.hasOwn(FrameworkPluginCheck.#PLATFORM_FAMILIES, directory)) {
      return FrameworkPluginCheck.#PLATFORM_FAMILIES[directory]
    }
    const base = this.#baseOf(plugin, plugins)
    if (base === null) return []
    return [basename(base.directory)]
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

  #inspectPlugin(plugin, families, report) {
    const dependencies = [
      FrameworkPluginCheck.#CORE,
      ...families.map((family) => `object-oriented-design-${family}`)
    ]
    for (const dependency of dependencies) {
      // Installing a framework skill alone would load half the rules.
      if (plugin.dependencies.includes(dependency)) continue
      report.error(
        join(plugin.directory, '.claude-plugin', 'plugin.json'),
        `framework plugin ${plugin.name} must list dependency ${dependency}`)
    }
    const baseSkills = families.map((family) => `oo-${family}`)
    for (const skill of plugin.skills()) {
      const overview = skill.document.section('Overview')
      for (const baseSkill of baseSkills) {
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
}
