import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class RaisesContractCheck extends Check {
  static #COMMENT = /--.*$/
  static #DECLARATION = /^(class|interface|value|enum)\s/
  static #CLASS = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/
  static #INTERFACE = /^interface\s+([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/
  static #IMPLEMENTS = /\bimplements\s+(.+)$/
  static #NAME = /^[A-Za-z_][A-Za-z0-9_]*/
  static #MEMBER =
    /^\s*[+-]\s+(?:static\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/
  static #RAISES = /^\s*raises\s+(.+?)\s*$/

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'raises-contract'
  }

  inspect(report) {
    const checked = this.#fences()
      .filter(({ document, fence }) => !this.#isBeforeFence(document, fence))
    // A run that checked no fence has measured nothing.
    report.count('fence(s)', checked.length)
    for (const { path, fence } of checked) {
      this.#inspectFence(path, fence, report)
    }
  }

  #fences() {
    const fences = []
    for (const skill of this.#repository.skills()) {
      fences.push(...this.#textFences(skill.path, skill.document))
      for (const file of skill.referenceFiles()) {
        fences.push(...this.#textFences(
          file.path,
          new MarkdownDocument(file)))
      }
    }
    return fences
  }

  #textFences(path, document) {
    // Only text fences hold the neutral notation this check reads.
    return document.fences()
      .filter((fence) => fence.language === 'text')
      .map((fence) => ({ path, document, fence }))
  }

  #isBeforeFence(document, fence) {
    // A fence under Before: shows the defect on purpose, so it is no finding.
    const lines = document.prose().split('\n')
    for (let line = fence.startLine - 1; line >= 1; line -= 1) {
      // A closing fence is non-blank even though prose() blanks it.
      if (this.#closesFenceAt(document, line)) return false
      const text = lines[line - 1].trim()
      if (text === '') continue
      return text === 'Before:'
    }
    return false
  }

  #closesFenceAt(document, line) {
    return document.fences()
      .some((other) => other.endLine === line)
  }

  #inspectFence(path, fence, report) {
    // A comment is prose for a reader, not a declaration to check.
    const lines = fence.body.split('\n')
      .map((line) => line.replace(RaisesContractCheck.#COMMENT, ''))
    const interfaces = new Map()
    const classes = new Map()
    this.#collectDeclarations(lines, interfaces, classes)
    for (const declaration of classes.values()) {
      this.#inspectClass(path, fence, declaration, interfaces, report)
    }
  }

  #collectDeclarations(lines, interfaces, classes) {
    let declaration = null
    let method = null
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (RaisesContractCheck.#DECLARATION.test(line)) {
        declaration = this.#declarationOf(line)
        method = null
        if (declaration === null) continue
        const table = declaration.kind === 'interface' ? interfaces : classes
        table.set(declaration.name, declaration)
        continue
      }
      const member = RaisesContractCheck.#MEMBER.exec(line)
      if (member !== null && declaration !== null) {
        method = { name: member[1], raises: [] }
        declaration.methods.set(method.name, method)
        continue
      }
      if (method === null) continue
      this.#recordRaises(method, line, index)
    }
  }

  #declarationOf(line) {
    const contract = RaisesContractCheck.#INTERFACE.exec(line)
    if (contract !== null) {
      return { kind: 'interface', name: contract[1], implements: [],
        methods: new Map() }
    }
    const implementation = RaisesContractCheck.#CLASS.exec(line)
    if (implementation === null) return null
    const clause = RaisesContractCheck.#IMPLEMENTS.exec(implementation[2])
    const names = clause === null ? [] : this.#interfaceNames(clause[1])
    return { kind: 'class', name: implementation[1], implements: names,
      methods: new Map() }
  }

  #interfaceNames(text) {
    return text.split(',')
      .map((part) => RaisesContractCheck.#NAME.exec(part.trim()))
      .filter((match) => match !== null)
      .map((match) => match[0])
  }

  #recordRaises(method, line, index) {
    const raises = RaisesContractCheck.#RAISES.exec(line)
    if (raises === null) return
    for (const name of raises[1].split(',')) {
      const trimmed = name.trim()
      if (trimmed === '') continue
      method.raises.push({ name: trimmed, index })
    }
  }

  #inspectClass(path, fence, implementation, interfaces, report) {
    for (const name of implementation.implements) {
      const contract = interfaces.get(name)
      // An interface in another fence or file is outside this rule.
      if (contract === undefined) continue
      this.#inspectContract(path, fence, implementation, contract, report)
    }
  }

  #inspectContract(path, fence, implementation, contract, report) {
    for (const [methodName, contractMethod] of contract.methods) {
      const method = implementation.methods.get(methodName)
      if (method === undefined) continue
      // An interface method with no raises line declares no error.
      const declared = new Set(
        contractMethod.raises.map(({ name }) => name))
      for (const { name, index } of method.raises) {
        if (declared.has(name)) continue
        report.error(
          `${path} line ${fence.startLine + index + 1}`,
          `raises: "${implementation.name}.${methodName}" raises ` +
          `"${name}", which "${contract.name}.${methodName}" ` +
          'does not declare')
      }
    }
  }
}
