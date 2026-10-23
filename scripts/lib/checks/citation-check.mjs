import { relative, sep } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class CitationCheck extends Check {
  // The pack cites no sources, so an unquoted mark is a citation.
  static #MARKS = Object.freeze([
    /\bISBN\b/gi,
    /\bet al\./gi,
    /\bop\. cit\./gi,
    /\bibid\./gi,
    /\bChapter \d+/gi,
    /\b\d+(?:st|nd|rd|th) edition\b/gi,
    /\((?:18|19|20)\d{2}\)/g
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'citation'
  }

  inspect(report) {
    // Only plugin prose is skill content; the repository's own docs may cite.
    const files = this.#repository.markdownFiles()
      .filter((file) => this.#pathOf(file).startsWith('plugins/'))
    // A run that read no plugin prose has measured nothing.
    report.count('prose file(s)', files.length)
    for (const file of files) {
      const path = this.#pathOf(file)
      // Inline code is how this repository quotes a mark it describes.
      const lines = new MarkdownDocument(file)
        .proseWithoutCode()
        .split('\n')
      for (const [index, line] of lines.entries()) {
        for (const pattern of CitationCheck.#MARKS) {
          // Each match is its own defect, at the reader's line number.
          for (const match of line.matchAll(pattern)) {
            report.error(
              `${path}:${index + 1}`,
              `citation mark: ${match[0]}`)
          }
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
