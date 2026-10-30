import { relative, sep } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class ExamplesCheck extends Check {
  static #PLUGINS = 'plugins/'
  static #PLAIN_TAGS = Object.freeze(['text', 'markdown'])

  #repository
  #syntaxes

  constructor(repository, syntaxes) {
    super()
    this.#repository = repository
    this.#syntaxes = syntaxes
    Object.freeze(this)
  }

  get name() {
    return 'examples'
  }

  async inspect(report) {
    let parsed = 0
    for (const file of this.#repository.markdownFiles()) {
      const path = this.#pathOf(file)
      const underPlugins = path.startsWith(ExamplesCheck.#PLUGINS)
      for (const fence of new MarkdownDocument(file).fences()) {
        if (this.#syntaxes.knows(fence.language)) {
          parsed += 1
          await this.#inspectFence(path, fence, report)
          continue
        }
        // Only plugin content promises a shipped language example.
        if (underPlugins) this.#inspectTag(path, fence, report)
      }
    }
    // A run that parsed no example fence has measured nothing.
    report.count('example fence(s)', parsed)
  }

  async #inspectFence(path, fence, report) {
    const problems = await this.#syntaxes.problems(
      fence.language,
      fence.body)
    for (const problem of problems) {
      report.error(
        path,
        `line ${fence.startLine}: ${fence.language} fence does not ` +
        `parse at ${problem.row}:${problem.column}: ${problem.message}`)
    }
  }

  #inspectTag(path, fence, report) {
    if (fence.language === '') {
      report.error(
        path,
        `line ${fence.startLine}: fence has no language tag`)
      return
    }
    if (ExamplesCheck.#PLAIN_TAGS.includes(fence.language)) return
    report.error(
      path,
      `line ${fence.startLine}: fence tag ${fence.language} is not ` +
      'one the examples check parses')
  }

  #pathOf(file) {
    // A report reads the same on every platform.
    return relative(this.#repository.root, file.path)
      .split(sep)
      .join('/')
  }
}
