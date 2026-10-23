export class Report {
  #errors = []
  #counts = []

  error(where, message) {
    this.#errors.push({ where, message })
  }

  count(noun, n) {
    this.#counts.push({ noun, n })
  }

  get failed() {
    return this.#errors.length > 0 ||
      this.#counts.length === 0 ||
      this.#counts.some(({ n }) => n === 0)
  }

  lines() {
    const lines = this.#errors.map(({ where, message }) =>
      `error ${where}: ${message}`)
    lines.push(this.#summary())
    return lines
  }

  #summary() {
    if (this.#errors.length > 0) {
      return `failed: ${this.#errors.length} error(s)`
    }
    if (this.#counts.length === 0) {
      return 'failed: measured nothing'
    }
    const zeros = this.#counts.filter(({ n }) => n === 0)
    if (zeros.length > 0) {
      return `failed: measured nothing (${zeros
        .map(({ noun, n }) => `${n} ${noun}`)
        .join(', ')})`
    }
    return `ok ${this.#counts
      .map(({ noun, n }) => `${n} ${noun}`)
      .join(', ')}`
  }
}
