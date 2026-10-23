import test from 'node:test'
import assert from 'node:assert/strict'

import { SharedParagraphCheck } from '../../../scripts/lib/checks/shared-paragraph-check.mjs'
import { MarkdownDocument } from '../../../scripts/lib/markdown-document.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const SHARED = 'A clinic appointment belongs to one slot, and the ' +
  'schedule must reject a second booking for the same slot before it ' +
  'writes anything else.'
const UNIQUE = 'The clinic schedule keeps a slot for each booked ' +
  'appointment and refuses a second patient until the first booking is ' +
  'released and its slot is free again.'
const SHORT = 'The slot is free.'

class FakeSkill {
  #name
  #path
  #document

  constructor(name, path, text) {
    this.#name = name
    this.#path = path
    this.#document = new MarkdownDocument(new TextFile(path, text))
  }

  get name() {
    return this.#name
  }

  get path() {
    return this.#path
  }

  get document() {
    return this.#document
  }

  referenceFiles() {
    return []
  }
}

class FakeRepository {
  #skills

  constructor(skills) {
    this.#skills = Object.freeze([...skills])
  }

  skills() {
    return this.#skills
  }
}

class CheckRun {
  static of(skills) {
    const report = new Report()
    new SharedParagraphCheck(
      new FakeRepository(skills)).inspect(report)
    return report
  }
}

test('SharedParagraphCheck rejects a long paragraph in two skills', () => {
  const report = CheckRun.of([
    new FakeSkill(
      'oo-assigning-responsibilities',
      'plugins/core/skills/oo-assigning-responsibilities/SKILL.md',
      `# One\n\n${SHARED}\n`),
    new FakeSkill(
      'oo-design',
      'plugins/core/skills/oo-design/SKILL.md',
      `# Two\n\n${SHARED}\n`)
  ])
  assert.deepEqual(report.lines(), [
    'error plugins/core/skills/oo-design/SKILL.md: ' +
      'paragraph is shared by oo-design and oo-assigning-responsibilities',
    'failed: 1 error(s)'
  ])
})

test('SharedParagraphCheck passes a short shared line', () => {
  const report = CheckRun.of([
    new FakeSkill(
      'oo-assigning-responsibilities',
      'plugins/core/skills/oo-assigning-responsibilities/SKILL.md',
      `# One\n\n${UNIQUE}\n\n${SHORT}\n`),
    new FakeSkill(
      'oo-design',
      'plugins/core/skills/oo-design/SKILL.md',
      `# Two\n\n${SHORT}\n`)
  ])
  assert.deepEqual(report.lines(), ['ok 1 paragraph(s)'])
})
