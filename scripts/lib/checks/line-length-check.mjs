import { relative, sep } from 'node:path'

import { Check } from '../check.mjs'

export class LineLengthCheck extends Check {
  static #LIMIT = 80

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'line-length'
  }

  inspect(report) {
    const files = this.#repository.markdownFiles()
    // A run that read no Markdown file has measured nothing.
    report.count('markdown file(s)', files.length)
    for (const file of files) {
      const path = this.#pathOf(file)
      const lines = file.lines()
      for (let index = this.#bodyStart(lines); index < lines.length;
        index += 1) {
        const line = lines[index]
        if (line.length <= LineLengthCheck.#LIMIT) continue
        // A long line passes only when no space sits at column 80 or
        // later, such as a long URL.
        if (!line.slice(LineLengthCheck.#LIMIT - 1).includes(' ')) continue
        report.error(
          `${path}:${index + 1}`,
          `line is ${line.length} characters with a space at or after ` +
          `column ${LineLengthCheck.#LIMIT}`)
      }
    }
  }

  #bodyStart(lines) {
    if (lines[0] !== '---') return 0
    const end = lines.indexOf('---', 1)
    // An opening line with no closing line is not a frontmatter block.
    return end === -1 ? 0 : end + 1
  }

  #pathOf(file) {
    // A report reads the same on every platform.
    return relative(this.#repository.root, file.path)
      .split(sep)
      .join('/')
  }
}
