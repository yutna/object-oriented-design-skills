import test from 'node:test'
import assert from 'node:assert/strict'

import { DomainCheck } from '../../../scripts/lib/checks/domain-check.mjs'
import { MarkdownDocument } from '../../../scripts/lib/markdown-document.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'plugins/core/skills/oo-assigning-responsibilities/SKILL.md'

class FakeSkill {
  #path
  #document

  constructor(path, text) {
    this.#path = path
    this.#document = new MarkdownDocument(new TextFile(path, text))
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
  static of(text) {
    const report = new Report()
    new DomainCheck(new FakeRepository([
      new FakeSkill(PATH, text)
    ])).inspect(report)
    return report
  }
}

test('DomainCheck rejects a stock word in a text fence', () => {
  const report = CheckRun.of([
    '# Skill',
    '',
    '```text',
    'class Customer',
    '  - id',
    '```',
    ''
  ].join('\n'))
  assert.deepEqual(report.lines(), [
    `error ${PATH}: stock example word: customer`,
    'failed: 1 error(s)'
  ])
})

test('DomainCheck passes a clinic text fence', () => {
  const report = CheckRun.of([
    '# Skill',
    '',
    '```text',
    'class Slot',
    '  - patient: PatientId',
    '```',
    ''
  ].join('\n'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})
