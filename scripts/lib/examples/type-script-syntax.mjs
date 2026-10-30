import ts from 'typescript'

import { FenceSyntax } from './fence-syntax.mjs'
import { SyntaxProblem } from './syntax-problem.mjs'

export class TypeScriptSyntax extends FenceSyntax {
  #syntax

  constructor(syntax) {
    super()
    this.#syntax = syntax
    Object.freeze(this)
  }

  async problems(source) {
    const problems = await this.#syntax.problems(source)
    // A grammar recovers from some errors, so the compiler reads every
    // fence the grammar accepted.
    if (problems.length > 0) return problems
    const result = ts.transpileModule(source, {
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext
      }
    })
    return (result.diagnostics ?? [])
      .map((diagnostic) => this.#problemOf(source, diagnostic))
  }

  #problemOf(source, diagnostic) {
    const position = this.#positionOf(source, diagnostic)
    return new SyntaxProblem(
      position.row,
      position.column,
      `TS${diagnostic.code} ` +
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  }

  #positionOf(source, diagnostic) {
    if (diagnostic.file !== undefined && diagnostic.start !== undefined) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start)
      return { row: line + 1, column: character + 1 }
    }
    if (diagnostic.start === undefined) return { row: 1, column: 1 }
    const before = source.slice(0, diagnostic.start).split('\n')
    return { row: before.length, column: before.at(-1).length + 1 }
  }
}
