import { Check } from '../check.mjs'

export class PinnedDependencyCheck extends Check {
  static #PIN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
  }

  get name() {
    return 'pinned-dependency'
  }

  inspect(report) {
    const packageData = JSON.parse(
      this.#repository.file('package.json').text)
    const dependencies = this.#mapping(packageData.dependencies)
    const devDependencies = this.#mapping(packageData.devDependencies)
    report.count(
      'dependency(ies)',
      Object.keys(dependencies).length +
        Object.keys(devDependencies).length)
    this.#inspectDependencies(report, dependencies)
    this.#inspectDependencies(report, devDependencies)
  }

  #inspectDependencies(report, dependencies) {
    for (const [name, version] of Object.entries(dependencies)) {
      // Exact pins keep installs reproducible; ranges drift on the next install.
      if (typeof version !== 'string' ||
        !PinnedDependencyCheck.#PIN.test(version)) {
        report.error(
          'package.json',
          `dependency ${name} is not pinned to an exact version: ${version}`)
      }
    }
  }

  #mapping(value) {
    return value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
      ? value
      : {}
  }
}
