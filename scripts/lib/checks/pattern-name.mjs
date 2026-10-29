export class PatternName {
  #name
  #matcher

  constructor(name) {
    this.#name = name
    this.#matcher = PatternName.#matcherFor(name)
    Object.freeze(this)
  }

  static #matcherFor(name) {
    const escaped = [...name].map((character) => {
      if (character === ' ' || character === '-') return '[ -]'
      return character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }).join('')
    const variants = [escaped, `${escaped}s`, `${escaped}es`]
    if (name.toLowerCase().endsWith('y')) {
      variants.push(`${escaped.slice(0, -1)}ies`)
    }
    // Whole words only, and case does not decide whether the pack names it.
    return new RegExp(`\\b(?:${variants.join('|')})\\b`, 'iu')
  }

  get name() {
    return this.#name
  }

  foundIn(text) {
    return this.#matcher.test(text)
  }

  lineIn(text) {
    const index = text.split('\n')
      .findIndex((line) => this.#matcher.test(line))
    return index === -1 ? null : index + 1
  }

  equals(other) {
    return other instanceof PatternName &&
      this.#name.toLowerCase() === other.#name.toLowerCase()
  }
}
