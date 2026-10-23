export class Terms {
  // Common words carry no routing signal and only add noise.
  static #STOP_WORDS = Object.freeze([
    'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any',
    'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'between',
    'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'done',
    'during', 'each', 'every', 'for', 'from', 'had', 'has', 'have', 'having',
    'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into',
    'is', 'it', 'its', 'just', 'less', 'may', 'me', 'might', 'more', 'most',
    'my', 'no', 'nor', 'not', 'of', 'on', 'once', 'only', 'or', 'other',
    'our', 'over', 'same', 'shall', 'she', 'should', 'so', 'some', 'such',
    'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they',
    'this', 'those', 'to', 'too', 'under', 'until', 'up', 'us', 'use', 'used',
    'uses', 'using', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
    'whether', 'which', 'while', 'who', 'whom', 'why', 'will', 'with',
    'would', 'you', 'your'
  ])

  // Fold inflections so one concept does not split into several terms.
  static #SUFFIXES = Object.freeze([
    'ations', 'ation', 'ingly', 'ing', 'ies', 'ers', 'er', 'ed', 'es', 's'
  ])

  #words

  static of(text) {
    const words = (String(text ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? [])
    return new Terms(words
      .filter((word) => !Terms.#STOP_WORDS.includes(word))
      .map((word) => Terms.#stem(word)))
  }

  constructor(words) {
    this.#words = Object.freeze([...words])
    Object.freeze(this)
  }

  get words() {
    return this.#words
  }

  get length() {
    return this.#words.length
  }

  equals(other) {
    // Two term lists are equal word for word, in order.
    return other instanceof Terms &&
      other.#words.length === this.#words.length &&
      other.#words.every((word, index) => word === this.#words[index])
  }

  static #stem(word) {
    for (const suffix of Terms.#SUFFIXES) {
      if (!word.endsWith(suffix)) continue
      const base = word.slice(0, -suffix.length)
      // Never stem below three letters, or a short word loses its meaning.
      if (base.length < 3) continue
      // "ies" folds back to "y", the way the singular is written.
      return suffix === 'ies' ? `${base}y` : base
    }
    return word
  }
}
