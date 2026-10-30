import { FenceSyntax } from './fence-syntax.mjs'
import { SyntaxProblem } from './syntax-problem.mjs'

export class TreeSitterSyntax extends FenceSyntax {
  #parser

  constructor(parser) {
    super()
    this.#parser = parser
    Object.freeze(this)
  }

  async problems(source) {
    const tree = this.#parser.parse(source)
    if (tree === null) return [new SyntaxProblem(1, 1, 'parse failed')]
    const node = this.#firstProblem(tree.rootNode)
    if (node === null) return []
    return [new SyntaxProblem(
      node.startPosition.row + 1,
      node.startPosition.column + 1,
      node.isMissing ? `MISSING ${node.type}` : 'ERROR')]
  }

  #firstProblem(node) {
    // The tree lists children in document order, so the first bad node
    // in this walk is the first one a reader meets.
    if (node.isError || node.isMissing) return node
    for (const child of node.children) {
      const found = this.#firstProblem(child)
      if (found !== null) return found
    }
    return null
  }
}
