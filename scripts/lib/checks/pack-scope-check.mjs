import { relative, sep } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class PackScopeCheck extends Check {
  // A planned skill covers the subject, so "outside this skill" is the
  // honest wording; "outside this pack" sends the reader away from it.
  static #PHRASE = /outside (?:this|the) pack/gi

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'pack-scope'
  }

  inspect(report) {
    // Only plugin prose is skill content.
    const files = this.#repository.markdownFiles()
      .filter((file) => this.#pathOf(file).startsWith('plugins/'))
    // A run that read no plugin prose has measured nothing.
    report.count('prose file(s)', files.length)
    for (const file of files) {
      const path = this.#pathOf(file)
      // Inline code is how this repository quotes wording it describes.
      const lines = new MarkdownDocument(file)
        .proseWithoutCode()
        .split('\n')
      for (const [index, line] of lines.entries()) {
        // Each match is its own defect, at the reader's line number.
        for (const match of line.matchAll(PackScopeCheck.#PHRASE)) {
          report.error(
            `${path}:${index + 1}`,
            `pack scope: say "outside this skill", not "${match[0]}"`)
        }
      }
    }
  }

  #pathOf(file) {
    // A report reads the same on every platform.
    return relative(this.#repository.root, file.path)
      .split(sep)
      .join('/')
  }
}
