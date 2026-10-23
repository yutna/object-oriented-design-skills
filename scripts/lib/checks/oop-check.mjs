import { parse } from 'acorn'
import { full } from 'acorn-walk'
import { basename, dirname, join, relative, sep } from 'node:path'

import { Check } from '../check.mjs'

export class OopCheck extends Check {
  static #DECLARATIONS = new Set([
    'ArrowFunctionExpression',
    'ClassDeclaration',
    'ClassExpression',
    'FunctionDeclaration',
    'FunctionExpression'
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
  }

  get name() {
    return 'oop'
  }

  inspect(report) {
    const files = this.#repository.scriptFiles()
    report.count('file(s)', files.length)
    let classCount = 0
    for (const file of files) {
      const path = relative(this.#repository.root, file.path)
      const program = parse(file.text, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true
      })
      classCount += this.#classCount(program)
      if (path.startsWith(`${join('scripts', 'lib')}${sep}`)) {
        this.#inspectLib(path, program, report)
      } else if (dirname(path) === 'scripts') {
        this.#inspectEntry(path, program, report)
      }
    }
    report.count('class(es)', classCount)
  }

  #classCount(program) {
    let count = 0
    for (const node of program.body) {
      if (node.type === 'ClassDeclaration') {
        count += 1
        continue
      }
      if (node.type === 'ExportNamedDeclaration' &&
        node.declaration?.type === 'ClassDeclaration') {
        count += 1
      }
    }
    return count
  }

  #inspectLib(path, program, report) {
    const exported = []
    for (const node of program.body) {
      if (node.type === 'ImportDeclaration') continue
      if (node.type === 'ClassDeclaration') continue
      if (node.type === 'ExportNamedDeclaration' &&
        node.declaration?.type === 'ClassDeclaration') {
        exported.push(node.declaration.id.name)
        continue
      }
      report.error(
        `${path}:${node.loc.start.line}`,
        `top-level ${node.type} is not allowed`)
    }
    if (exported.length === 0) {
      report.error(path, 'exports no class')
      return
    }
    if (basename(path, '.mjs') === 'errors') return
    const name = this.#kebabCase(basename(path, '.mjs'))
    if (!exported.some((className) =>
      this.#kebabCase(className) === name)) {
      report.error(path, `exports no class named ${name}`)
    }
  }

  #inspectEntry(path, program, report) {
    let guards = 0
    let guard = null
    for (const node of program.body) {
      if (node.type === 'ImportDeclaration') continue
      if (node.type === 'IfStatement') {
        guards += 1
        guard = node
        continue
      }
      report.error(
        `${path}:${node.loc.start.line}`,
        `top-level ${node.type} is not allowed`)
    }
    if (guards !== 1 || !this.#isMainGuard(guard)) {
      report.error(path, 'needs exactly one import.meta.main guard')
      return
    }
    this.#inspectGuard(path, guard, report)
  }

  #inspectGuard(path, guard, report) {
    // An entry is a composition root: code here cannot be imported or tested.
    full(guard.consequent, (node) => {
      if (!OopCheck.#DECLARATIONS.has(node.type)) return
      report.error(
        `${path}:${node.loc.start.line}`,
        'the main guard may only compose objects, ' +
        `not declare ${node.type}`)
    })
  }

  #isMainGuard(node) {
    const test = node.test
    return test.type === 'MemberExpression' &&
      test.computed === false &&
      test.object.type === 'MetaProperty' &&
      test.object.meta.name === 'import' &&
      test.object.property.name === 'meta' &&
      test.property.type === 'Identifier' &&
      test.property.name === 'main'
  }

  #kebabCase(name) {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
  }
}
