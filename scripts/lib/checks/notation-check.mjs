import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class NotationCheck extends Check {
  static #COMMENT = /--.*$/
  static #OPERATOR = /(?<= )(<=|>=|!=|<>|==|<|>)(?= )/g
  static #ARITHMETIC = /(?<=\S)[ \t]+([+\-*/])[ \t]+(?=\S)/g
  static #LOOP = /^\s*(for|while)\b/
  static #CONSTRUCTION =
    /\bnew\s+[A-Za-z_][A-Za-z0-9_]*(?:<[^()]*>)?(?![<\w])(?!\s*\()/g
  static #SELF = /\b(this|self)\b/g
  static #SEMICOLON = /;/g
  static #DECLARATION = /^(class|interface|value|enum)\s/
  static #MEMBER = /^\s*[+-] /
  static #RAISE = /^\s*raise\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/
  static #RAISES = /^\s*raises\s+(.+?)\s*$/

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
    // A comment is prose for a reader, not syntax to check.
    const lines = fence.body.split('\n')
      .map((line) => line.replace(NotationCheck.#COMMENT, ''))
    const body = this.#bodyLines(lines)
    for (let index = 0; index < lines.length; index += 1) {
      this.#inspectLine(
        path,
        fence.startLine + index + 1,
        lines[index],
        body.has(index),
        report)
    }
    this.#inspectRaises(path, fence.startLine, lines, report)
  }

  #bodyLines(lines) {
    // A body line sits under a completed member signature. A signature
    // that left a parenthesis open continues on the next line.
    const body = new Set()
    let underMember = false
    let open = 0
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (NotationCheck.#DECLARATION.test(line)) {
        underMember = false
        open = 0
        continue
      }
      if (NotationCheck.#MEMBER.test(line)) {
        underMember = true
        open = NotationCheck.#parenBalance(line)
        continue
      }
      if (!underMember) continue
      if (open > 0) {
        open += NotationCheck.#parenBalance(line)
        continue
      }
      body.add(index)
    }
    return body
  }

  static #parenBalance(line) {
    let balance = 0
    for (const character of line) {
      if (character === '(') balance += 1
      if (character === ')') balance -= 1
    }
    return balance
  }

  #inspectLine(path, number, line, inBody, report) {
    this.#inspectOperators(path, number, line, report)
    if (inBody) this.#inspectArithmetic(path, number, line, report)
    this.#inspectLoops(path, number, line, report)
    this.#inspectConstructions(path, number, line, report)
    this.#inspectSelf(path, number, line, report)
    this.#inspectSemicolons(path, number, line, report)
  }

  #inspectArithmetic(path, number, line, report) {
    // An infix operation has no meaning here; a message send carries it.
    for (const match of line.matchAll(NotationCheck.#ARITHMETIC)) {
      this.#report(
        report,
        path,
        number,
        `notation: operator "${match[1]}" is not defined`)
    }
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

  #inspectRaises(path, startLine, lines, report) {
    // A caller must be able to handle every error the body raises itself.
    let member = null
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (NotationCheck.#DECLARATION.test(line)) {
        this.#checkMemberRaises(path, startLine, member, report)
        member = null
        continue
      }
      if (NotationCheck.#MEMBER.test(line)) {
        this.#checkMemberRaises(path, startLine, member, report)
        member = { raises: new Set(), raised: [] }
        continue
      }
      if (member === null) continue
      this.#recordMemberLine(member, line, index)
    }
    this.#checkMemberRaises(path, startLine, member, report)
  }

  #recordMemberLine(member, line, index) {
    const raise = NotationCheck.#RAISE.exec(line)
    if (raise !== null) {
      member.raised.push({ name: raise[1], index })
      return
    }
    const raises = NotationCheck.#RAISES.exec(line)
    if (raises === null) return
    for (const name of raises[1].split(',')) {
      member.raises.add(name.trim())
    }
  }

  #checkMemberRaises(path, startLine, member, report) {
    if (member === null) return
    for (const { name, index } of member.raised) {
      if (member.raises.has(name)) continue
      this.#report(
        report,
        path,
        startLine + index + 1,
        `notation: raise "${name}" needs a "raises ${name}" line ` +
        'under the signature')
    }
  }

  #report(report, path, number, message) {
    report.error(`${path} line ${number}`, message)
  }
}
