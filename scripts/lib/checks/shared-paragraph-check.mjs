import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { SkillShapeCheck } from './skill-shape-check.mjs'

export class SharedParagraphCheck extends Check {
  // A short line can repeat; only a substantial paragraph is worth comparing.
  static #MINIMUM = 120

  // These repeats are deliberate, and the rest are corrected in one place.
  static SHARED_ON_PURPOSE = Object.freeze([
    SkillShapeCheck.BACK_LINK,
    SkillShapeCheck.LANGUAGE_BACK_LINK,
    'Places to look, not verdicts. A red flag becomes a finding only ' +
    'with evidence: a measurement, a reproducible bug, or a failing test.'
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'shared-paragraph'
  }

  inspect(report) {
    const allowed = new Set(
      SharedParagraphCheck.SHARED_ON_PURPOSE
        .map((text) => this.#collapse(text)))
    const seen = new Map()
    let paragraphs = 0
    for (const skill of this.#repository.skills()) {
      for (const file of this.#filesOf(skill)) {
        for (const paragraph of this.#paragraphs(file.document)) {
          const text = this.#collapse(paragraph)
          // A short line can repeat; a substantial paragraph cannot.
          if (text.length < SharedParagraphCheck.#MINIMUM) continue
          paragraphs += 1
          const first = seen.get(text)
          if (first === undefined) {
            seen.set(text, { skill: skill.name, path: file.path })
            continue
          }
          // A repeat inside one skill is that skill's own shape.
          if (first.skill === skill.name) continue
          if (allowed.has(text)) continue
          // A shared paragraph is corrected in one place, not both.
          report.error(
            file.path,
            `paragraph is shared by ${skill.name} and ${first.skill}`)
        }
      }
    }
    // A run that read no substantial paragraph has measured nothing.
    report.count('paragraph(s)', paragraphs)
  }

  #filesOf(skill) {
    // A skill's prose lives in its page and in its references.
    return [
      { path: skill.path, document: skill.document },
      ...skill.referenceFiles().map((file) => ({
        path: file.path,
        document: new MarkdownDocument(file)
      }))
    ]
  }

  #paragraphs(document) {
    // Blank lines separate paragraphs after every fence has been removed.
    return document.prose().split(/\n[ \t]*\n/)
  }

  #collapse(text) {
    // Whitespace is not content when two paragraphs are compared.
    return text.replace(/\s+/g, ' ').trim()
  }
}
