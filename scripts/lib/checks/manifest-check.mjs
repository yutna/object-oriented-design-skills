import { basename, join } from 'node:path'

import { Check } from '../check.mjs'

export class ManifestCheck extends Check {
  static #CORE = 'object-oriented-design-skills'
  static #PREFIX = 'object-oriented-design-'

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
  }

  get name() {
    return 'manifest'
  }

  inspect(report) {
    const marketplace = this.#repository.marketplace()
    const entries = marketplace.entries()
    const plugins = marketplace.plugins()
    report.count('manifest(s)', entries.length + plugins.length)
    const packageVersion = this.#repository.packageVersion
    const marketplacePath = join(
      this.#repository.root,
      '.claude-plugin',
      'marketplace.json')

    for (const [index, entry] of entries.entries()) {
      // A marketplace version that drifts breaks installation.
      if (entry.version !== packageVersion) {
        report.error(
          marketplacePath,
          `marketplace entry ${entry.name} version ${entry.version} ` +
          `does not match package version ${packageVersion}`)
      }
      this.#inspectLanguagePlugin(
        entry,
        plugins[index],
        marketplacePath,
        report)
    }

    for (const plugin of plugins) {
      // A plugin version that drifts breaks its marketplace entry.
      if (plugin.version !== packageVersion) {
        report.error(
          join(plugin.directory, '.claude-plugin', 'plugin.json'),
          `plugin ${plugin.name} version ${plugin.version} ` +
          `does not match package version ${packageVersion}`)
      }
    }

    // A package.json under plugins hides dependencies from the root lockfile.
    for (const path of this.#repository.filesNamed(
      'package.json',
      'plugins')) {
      report.error(path, 'package.json is not allowed under plugins')
    }
  }

  #inspectLanguagePlugin(entry, plugin, path, report) {
    // The core plugin keeps its own name and its own directory.
    if (entry.name === ManifestCheck.#CORE) return
    const directory = basename(plugin.directory)
    const expectedName = `${ManifestCheck.#PREFIX}${directory}`
    // A language plugin is named after its family directory.
    if (entry.name !== expectedName) {
      report.error(
        path,
        `marketplace entry ${entry.name} must be named ${expectedName}`)
    }
    // The entry's source names the same family as its name.
    const family = entry.name.startsWith(ManifestCheck.#PREFIX)
      ? entry.name.slice(ManifestCheck.#PREFIX.length)
      : directory
    const expectedSource = `./plugins/${family}`
    if (entry.source !== expectedSource) {
      report.error(
        path,
        `marketplace entry ${entry.name} source ${entry.source} ` +
        `must be ${expectedSource}`)
    }
  }
}
