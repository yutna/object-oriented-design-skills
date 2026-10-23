import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class DomainCheck extends Check {
  // A stock example is a sign the example left the clinic.
  static #STOCK = Object.freeze([
    'customer',
    'product',
    'cart',
    'basket',
    'shipment',
    'employee',
    'animal',
    'dog',
    'cat',
    'duck',
    'shape',
    'circle',
    'rectangle',
    'vehicle',
    'car',
    'pizza',
    'coffee',
    'library',
    'flight',
    'foo',
    'bar',
    'widget'
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'domain'
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
      for (const word of this.#words(fence.body)) {
        const term = word.toLowerCase()
        if (!DomainCheck.#STOCK.includes(term)) continue
        // A stock word in any fence is outside the clinic example.
        report.error(path, `stock example word: ${term}`)
      }
    }
  }

  #textFences(path, document) {
    // Only text fences hold examples that can leave the clinic.
    return document.fences()
      .filter((fence) => fence.language === 'text')
      .map((fence) => ({ path, fence }))
  }

  #words(text) {
    // Identifiers split where a reader sees a new word.
    return text
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[^A-Za-z]+/g, ' ')
      .split(/\s+/)
      .filter((word) => word !== '')
  }
}
