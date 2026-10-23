import { MarkdownDocument } from '../markdown-document.mjs'
import { Fact } from './fact.mjs'

export class ListItemsUnder extends Fact {
  // Only a line that opens with a list marker is a top-level item.
  static #ITEM = /^(?:[-*+]|\d+[.)])\s+\S/

  #path
  #heading

  constructor(path, heading) {
    super()
    this.#path = path
    this.#heading = heading
    Object.freeze(this)
  }

  value(repository) {
    const document = new MarkdownDocument(repository.file(this.#path))
    const section = document.section(this.#heading)
    if (section === null) return 0
    return section.split('\n').filter((line) =>
      ListItemsUnder.#ITEM.test(line)).length
  }

  equals(other) {
    return other instanceof ListItemsUnder &&
      other.#path === this.#path &&
      other.#heading === this.#heading
  }
}
