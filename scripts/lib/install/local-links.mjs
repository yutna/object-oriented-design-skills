import { dirname, join } from 'node:path'

import { Check } from '../check.mjs'
import { LinkOptions } from './link-options.mjs'

export class LocalLinks extends Check {
  #repository
  #argv
  #fileSystem

  constructor(repository, argv, fileSystem) {
    super()
    this.#repository = repository
    this.#argv = Object.freeze([...argv])
    this.#fileSystem = fileSystem
    Object.freeze(this)
  }

  get name() {
    return 'link-local'
  }

  inspect(report) {
    const marketplace = this.#repository.marketplace()
    const options = LinkOptions.parse(this.#argv, marketplace)
    const skillsRoot = join(this.#repository.root, '.claude', 'skills')
    if (options.remove) {
      this.#remove(report, skillsRoot)
      return
    }
    const skills = marketplace.plugins()
      .filter((plugin) => options.plugins.includes(plugin.name))
      .flatMap((plugin) => plugin.skills())
      .sort((left, right) =>
        left.directoryName.localeCompare(right.directoryName))
    if (!this.#fileSystem.exists(skillsRoot)) {
      this.#fileSystem.makeDirectory(skillsRoot)
    }
    let links = 0
    for (const skill of skills) {
      const target = join(skillsRoot, skill.directoryName)
      // A non-link is not ours to replace.
      if (this.#fileSystem.exists(target) &&
        !this.#fileSystem.isLink(target)) {
        report.error(target, 'is not a link; left in place')
        continue
      }
      if (this.#fileSystem.isLink(target)) this.#fileSystem.remove(target)
      this.#fileSystem.link(dirname(skill.path), target)
      links += 1
    }
    report.count('link(s)', links)
  }

  #remove(report, skillsRoot) {
    let removed = 0
    if (this.#fileSystem.exists(skillsRoot)) {
      for (const name of this.#fileSystem.readDirectory(skillsRoot)) {
        const path = join(skillsRoot, name)
        // Only links are ours; everything else under .claude stays.
        if (!this.#fileSystem.isLink(path)) {
          report.error(path, 'is not a link; left in place')
          continue
        }
        this.#fileSystem.remove(path)
        removed += 1
      }
      if (this.#fileSystem.readDirectory(skillsRoot).length === 0) {
        this.#fileSystem.remove(skillsRoot)
      }
    }
    report.count('link(s) removed', removed)
  }
}
