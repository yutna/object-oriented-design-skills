import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class NotationCheck extends Check {
  static #COMMENT = /--.*$/
  static #OPERATOR = /(?<= )(<=|>=|!=|<>|==|<|>)(?= )/g
  static #LOOP = /^\s*(for|while)\b/
  static #CONSTRUCTION =
    /\bnew\s+[A-Za-z_][A-Za-z0-9_]*(?:<[^()]*>)?(?![<\w])(?!\s*\()/g
  static #SELF = /\b(this|self)\b/g
  static #SEMICOLON = /;/g

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'notation'
  }

  inspect(report) {
    const fences = []
    for (const skill of this.#repository.skills()) {
      fences.push(...this.#textFences(skill.path, skill.document))
      for (const file of skill.referenceFiles()) {
        fences.push(...this.#textFences(
          file.path,
          new MarkdownDocument(file)))
      }
    }
    // A run that read no text fence has measured nothing.
    report.count('fence(s)', fences.length)
    for (const { path, fence } of fences) {
      this.#inspectFence(path, fence, report)
    }
  }

  #textFences(path, document) {
    // Only text fences hold the notation this check knows.
    return document.fences()
      .filter((fence) => fence.language === 'text')
      .map((fence) => ({ path, fence }))
  }

  #inspectFence(path, fence, report) {
    const lines = fence.body.split('\n')
    for (let index = 0; index < lines.length; index += 1) {
      // A comment is prose for a reader, not syntax to check.
      const line = lines[index].replace(NotationCheck.#COMMENT, '')
      this.#inspectLine(path, fence.startLine + index + 1, line, report)
    }
  }

  #inspectLine(path, number, line, report) {
    this.#inspectOperators(path, number, line, report)
    this.#inspectLoops(path, number, line, report)
    this.#inspectConstructions(path, number, line, report)
    this.#inspectSelf(path, number, line, report)
    this.#inspectSemicolons(path, number, line, report)
  }

  #inspectOperators(path, number, line, report) {
    // An ordering or inequality operator has no meaning here.
    for (const match of line.matchAll(NotationCheck.#OPERATOR)) {
      this.#report(
        report,
        path,
        number,
        `notation: operator "${match[1]}" is not defined`)
    }
  }

  #inspectLoops(path, number, line, report) {
    // The notation has no loop of any kind.
    const match = NotationCheck.#LOOP.exec(line)
    if (match === null) return
    this.#report(
      report,
      path,
      number,
      `notation: loop "${match[1]}" is not defined`)
  }

  #inspectConstructions(path, number, line, report) {
    // A construction always carries its arguments in parentheses.
    for (const match of line.matchAll(NotationCheck.#CONSTRUCTION)) {
      this.#report(
        report,
        path,
        number,
        'notation: construction needs "new Name(args)"')
    }
  }

  #inspectSelf(path, number, line, report) {
    // The notation sends messages to named collaborators, not to itself.
    for (const match of line.matchAll(NotationCheck.#SELF)) {
      this.#report(
        report,
        path,
        number,
        `notation: "${match[1]}" is not defined`)
    }
  }

  #inspectSemicolons(path, number, line, report) {
    // A statement ends at the line break in this notation.
    for (const match of line.matchAll(NotationCheck.#SEMICOLON)) {
      this.#report(
        report,
        path,
        number,
        'notation: semicolons are not used')
    }
  }

  #report(report, path, number, message) {
    report.error(`${path} line ${number}`, message)
  }
}
