import { Terms } from './terms.mjs'

export class RoutingIndex {
  #skills
  #documentFrequency

  constructor(skills) {
    this.#skills = Object.freeze([...skills].map((skill) => {
      const name = Terms.of(
        String(skill.name ?? '').replaceAll('-', ' ')).words
      const description = Terms.of(skill.description).words
      // The name is the strongest discovery signal, so count it twice.
      const words = [...name, ...name, ...description]
      return Object.freeze({
        name: skill.name,
        counts: RoutingIndex.#counts(words)
      })
    }))
    this.#documentFrequency =
      RoutingIndex.#documentFrequencies(this.#skills)
    Object.freeze(this)
  }

  rank(symptom) {
    const terms = Terms.of(symptom).words
    const total = this.#skills.length
    const ranked = this.#skills.map(({ name, counts }) => {
      let score = 0
      for (const term of terms) {
        const tf = counts.get(term)
        if (tf === undefined) continue
        // Rare terms separate skills; common terms should not dominate.
        const df = this.#documentFrequency.get(term)
        score += (1 + Math.log(tf)) * Math.log(total / df)
      }
      return Object.freeze({ name, score })
    })
    // A tie falls back to the name so the report is stable.
    ranked.sort((left, right) =>
      (right.score - left.score) ||
      left.name.localeCompare(right.name))
    return Object.freeze(ranked)
  }

  static #counts(words) {
    const counts = new Map()
    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
    return counts
  }

  static #documentFrequencies(skills) {
    const frequencies = new Map()
    for (const skill of skills) {
      for (const term of skill.counts.keys()) {
        frequencies.set(term, (frequencies.get(term) ?? 0) + 1)
      }
    }
    return frequencies
  }
}
