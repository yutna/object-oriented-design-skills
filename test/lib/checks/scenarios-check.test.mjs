import test from 'node:test'
import assert from 'node:assert/strict'

import { ScenariosCheck } from '../../../scripts/lib/checks/scenarios-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

class FakeSkill {
  #name

  constructor(name) {
    this.#name = name
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }
}

class FakeRepository {
  #skills
  #scenarios

  constructor(skills, lines) {
    this.#skills = Object.freeze([...skills])
    this.#scenarios = new TextFile(
      'evals/scenarios.md',
      ['# Scenarios', '', 'A test file.', '', ...lines, ''].join('\n'))
  }

  skills() {
    return this.#skills
  }

  file(path) {
    assert.equal(path, 'evals/scenarios.md')
    return this.#scenarios
  }
}

class CheckRun {
  static of(skills, lines) {
    const report = new Report()
    new ScenariosCheck(new FakeRepository(skills, lines)).inspect(report)
    return report
  }
}

const SKILLS = [
  new FakeSkill('oo-design'),
  new FakeSkill('oo-assigning-responsibilities')
]

test('scenarios reject a gap in numbering', () => {
  const report = CheckRun.of(SKILLS, [
    '## 1. A slot rule in the controller',
    '',
    '> Our appointment controller decides whether a slot is free.',
    '',
    'Must contain: the rule moving to the object that holds the slot.',
    '',
    'Should reach `oo-assigning-responsibilities`.',
    '',
    '## 3. A visit class doing too much',
    '',
    '> Our visit class books, reminds and invoices.',
    '',
    'Must contain: the three jobs landing on separate objects.',
    '',
    'Should reach `oo-assigning-responsibilities`.'
  ])
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/scenarios.md: ' +
      'scenario numbering must start at 1 and run without gaps or repeats',
    'failed: 1 error(s)'
  ])
})

test('scenarios reject a missing Must contain paragraph', () => {
  const report = CheckRun.of(SKILLS, [
    '## 1. A visit class doing too much',
    '',
    '> Our visit class books, reminds and invoices.',
    '',
    'Should reach `oo-assigning-responsibilities`.'
  ])
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/scenarios.md: ' +
      'scenario 1 must have a "Must contain:" paragraph',
    'failed: 1 error(s)'
  ])
})

test('scenarios reject an unknown skill', () => {
  const report = CheckRun.of(SKILLS, [
    '## 1. A slot rule in the controller',
    '',
    '> Our appointment controller decides whether a slot is free.',
    '',
    'Must contain: the rule moving to the object that holds the slot.',
    '',
    'Should reach `oo-no-such-skill`.'
  ])
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/scenarios.md: ' +
      'scenario 1 names unknown skill: oo-no-such-skill',
    'failed: 1 error(s)'
  ])
})

test('a passing scenarios file counts its scenarios', () => {
  const report = CheckRun.of(SKILLS, [
    '## 1. A slot rule in the controller',
    '',
    '> Our appointment controller decides whether a slot is free.',
    '',
    'Must contain: the rule moving to the object that holds the slot.',
    '',
    'Should reach `oo-assigning-responsibilities`.'
  ])
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), ['ok 1 scenario(s)'])
})
