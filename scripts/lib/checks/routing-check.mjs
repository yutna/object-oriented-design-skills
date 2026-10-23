import { Check } from '../check.mjs'
import { RoutingCases } from '../routing/routing-cases.mjs'
import { RoutingIndex } from '../routing/routing-index.mjs'

export class RoutingCheck extends Check {
  static #CASES = 'evals/routing-cases.md'

  #repository
  #noise

  constructor(repository, noise) {
    super()
    this.#repository = repository
    this.#noise = noise === true
    Object.freeze(this)
  }

  get name() {
    return 'routing'
  }

  inspect(report) {
    const skills = this.#repository.skills()
    const index = new RoutingIndex(skills)
    const cases = RoutingCases.of(this.#repository.file(RoutingCheck.#CASES))
    // A run that read no case is a failed measurement, not a clean pass.
    report.count('routing case(s)', cases.length)
    // The cap keeps the gate meaningful when a pack has few skills.
    const top = Math.min(3, skills.length - 1)
    let top1 = 0
    const noise = new Map(skills.map(({ name }) => [name, 0]))
    for (const testCase of cases) {
      const expected = testCase.expected
      if (!skills.some(({ name }) => name === expected)) {
        // An unknown name has no skill to route to.
        report.error(
          RoutingCheck.#CASES,
          `unknown expected skill: ${expected}`)
        continue
      }
      const ranked = index.rank(testCase.symptom)
      const position = ranked.findIndex(({ name }) => name === expected) + 1
      const score = ranked[position - 1]?.score ?? 0
      // Top-1 counts cases where the expected skill ranked first.
      if (position === 1) top1 += 1
      if (position > top || score <= 0) {
        // The gate needs both a top rank and a positive score.
        report.error(
          RoutingCheck.#CASES,
          `expected ${expected} in the top ${top} ` +
          'with a score above zero')
      }
      for (const entry of ranked.slice(0, 3)) {
        if (entry.name === expected || entry.score <= 0) continue
        // Noise is a diagnostic; it never changes the exit code.
        noise.set(entry.name, (noise.get(entry.name) ?? 0) + 1)
      }
    }
    // The top-1 note is a rank count, shown on every run.
    report.note(`top-1: ${top1}/${cases.length}`)
    if (this.#noise) this.#reportNoise(report, noise)
  }

  #reportNoise(report, noise) {
    const ordered = [...noise]
      .sort((left, right) =>
        (right[1] - left[1]) || left[0].localeCompare(right[0]))
    for (const [name, count] of ordered) {
      // Noise counts a skill entering the top three for another's case.
      report.note(
        `noise: ${name} reached the top 3 ` +
        `for ${count} case(s) it does not own`)
    }
  }
}
