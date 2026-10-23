import { RepoError } from '../errors.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { RoutingCase } from './routing-case.mjs'

export class RoutingCases {
  static #LANGUAGE = 'text'

  static of(textFile) {
    // Only the text fence holds cases; other fences are not routing data.
    const fence = new MarkdownDocument(textFile).fences()
      .find((candidate) => candidate.language === RoutingCases.#LANGUAGE)
    if (fence === undefined) return Object.freeze([])
    const cases = []
    const lines = fence.body.split('\n')
    for (const [index, raw] of lines.entries()) {
      const line = raw.trim()
      if (line === '') continue
      const arrow = line.lastIndexOf('->')
      if (arrow === -1) {
        // A case without an arrow names no expected skill.
        throw new RepoError(
          `${textFile.path}:${fence.startLine + index + 1}: ` +
          'routing case needs "->"')
      }
      cases.push(new RoutingCase(
        line.slice(0, arrow).trim(),
        line.slice(arrow + 2).trim()))
    }
    return Object.freeze(cases)
  }
}
