import { FenceSyntax } from './fence-syntax.mjs'
import { SyntaxProblem } from './syntax-problem.mjs'

export class JsonSyntax extends FenceSyntax {
  async problems(source) {
    try {
      JSON.parse(source)
      return []
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return [new SyntaxProblem(1, 1, message)]
    }
  }
}
