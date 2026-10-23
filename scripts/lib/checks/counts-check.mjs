import { Check } from '../check.mjs'
import { CountClaims } from '../counts/count-claims.mjs'
import { NumberWords } from '../counts/number-words.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class CountsCheck extends Check {
  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'counts'
  }

  inspect(report) {
    const claims = CountClaims.ALL
    // A run that read no claim has measured nothing.
    report.count('claim(s)', claims.length)
    for (const claim of claims) {
      const file = this.#repository.file(claim.path)
      // A line wrap must not hide a claim.
      const prose = new MarkdownDocument(file).prose()
        .replace(/\s+/g, ' ')
        .trim()
      const match = claim.pattern.exec(prose)
      if (match === null) {
        // A missing sentence stops the check, so it is an error.
        report.error(claim.path, `claim not found: ${claim.pattern}`)
        continue
      }
      const written = match[1]
      const expected = claim.fact.value(this.#repository)
      // A stale number is the drift this check exists to catch.
      if (NumberWords.toNumber(written) !== expected) {
        report.error(
          claim.path,
          `stated ${written} but the fact is ${expected}`)
      }
    }
  }
}
