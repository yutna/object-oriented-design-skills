import { join } from 'node:path'

import { Check } from '../check.mjs'

export class ManifestCheck extends Check {
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

    for (const entry of entries) {
      // A marketplace version that drifts breaks installation.
      if (entry.version !== packageVersion) {
        report.error(
          join(
            this.#repository.root,
            '.claude-plugin',
            'marketplace.json'),
          `marketplace entry ${entry.name} version ${entry.version} ` +
          `does not match package version ${packageVersion}`)
      }
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
}
