import { RepoError } from '../errors.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { RoutingCase } from './routing-case.mjs'

export class RoutingCases {
  static #LANGUAGE = 'text'
  static #KNOWN_MISSES = 'Known misses'

  static of(textFile) {
    // Only the first text fence holds cases; other fences are not routing data.
    const fence = new MarkdownDocument(textFile).fences()
      .find((candidate) => candidate.language === RoutingCases.#LANGUAGE)
    return RoutingCases.#read(textFile, fence)
  }

  static knownMissesOf(textFile) {
    // A known miss sits only in its own section; no section means none.
    const document = new MarkdownDocument(textFile)
    return RoutingCases.#read(
      textFile,
      RoutingCases.#knownMissFence(document))
  }

  static #knownMissFence(document) {
    const heading = document.headings().find((candidate) =>
      candidate.text === RoutingCases.#KNOWN_MISSES)
    if (heading === undefined) return undefined
    const next = document.headings().find((candidate) =>
      candidate.line > heading.line && candidate.level <= heading.level)
    return document.fences().find((candidate) =>
      candidate.language === RoutingCases.#LANGUAGE &&
      candidate.startLine > heading.line &&
      (next === undefined || candidate.startLine < next.line))
  }

  static #read(textFile, fence) {
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
