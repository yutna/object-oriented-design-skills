import { dirname, join } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { InstallOptions } from './install-options.mjs'
import { OwnershipReader } from './ownership-reader.mjs'

export class Installer extends Check {
  static #BLOCK = 'plugins/core/skills/oo-design/references/' +
    'claude-md-block.md'

  #repository
  #home
  #argv
  #fileSystem

  constructor(repository, home, argv, fileSystem) {
    super()
    this.#repository = repository
    this.#home = home
    this.#argv = Object.freeze([...argv])
    this.#fileSystem = fileSystem
    Object.freeze(this)
  }

  get name() {
    return 'install'
  }

  inspect(report) {
    const marketplace = this.#repository.marketplace()
    const options = InstallOptions.parse(this.#argv, marketplace)
    const skills = marketplace.plugins()
      .filter((plugin) => options.plugins.includes(plugin.name))
      .flatMap((plugin) => plugin.skills())
      .sort((left, right) =>
        left.directoryName.localeCompare(right.directoryName))
    const targetRoot = join(this.#home, '.claude', 'skills')
    if (!options.dryRun) this.#fileSystem.makeDirectory(targetRoot)
    const reader = new OwnershipReader(this.#fileSystem)
    for (const skill of skills) {
      const target = join(targetRoot, skill.directoryName)
      const action = reader.of(target).decide(options)
      action.apply(
        dirname(skill.path),
        target,
        this.#fileSystem,
        report,
        options.dryRun)
    }
    report.count('skill(s) considered', skills.length)
    this.#reportBlock(report)
  }

  #reportBlock(report) {
    const fence = new MarkdownDocument(
      this.#repository.file(Installer.#BLOCK)).fences()
      .find((candidate) => candidate.language === 'markdown')
    if (fence === undefined) {
      report.error(Installer.#BLOCK, 'no markdown fence holds the block')
      return
    }
    report.note("add this block to the project's CLAUDE.md:")
    for (const line of fence.body.split('\n')) report.note(line)
  }
}
