import test from 'node:test'
import assert from 'node:assert/strict'

import { RoutingCheck } from '../../../scripts/lib/checks/routing-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

class FakeSkill {
  #name
  #description

  constructor(name, description) {
    this.#name = name
    this.#description = description
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }

  get description() {
    return this.#description
  }
}

class FakeRepository {
  #skills
  #cases

  constructor(skills, lines) {
    this.#skills = Object.freeze([...skills])
    this.#cases = new TextFile(
      'evals/routing-cases.md',
      ['# Routing Cases', '', 'A test file.', '', '```text',
        ...lines, '```', ''].join('\n'))
  }

  skills() {
    return this.#skills
  }

  file(path) {
    assert.equal(path, 'evals/routing-cases.md')
    return this.#cases
  }
}

class CheckRun {
  static of(skills, lines, noise = false) {
    const report = new Report()
    const repository = new FakeRepository(skills, lines)
    new RoutingCheck(repository, noise).inspect(report)
    return report
  }
}

const SKILLS = [
  new FakeSkill('oo-design', 'design'),
  new FakeSkill('oo-assigning-responsibilities', 'class')
]

test('an unknown expected skill yields its error', () => {
  const report = CheckRun.of(SKILLS, [
    'a clinic design -> oo-no-such-skill'
  ])
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/routing-cases.md: ' +
      'unknown expected skill: oo-no-such-skill',
    'top-1: 0/1',
    'failed: 1 error(s)'
  ])
})

test('a case outside the top rank yields its error', () => {
  const report = CheckRun.of(SKILLS, [
    'a clinic appointment slot -> oo-design'
  ])
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/routing-cases.md: ' +
      'expected oo-design in the top 1 with a score above zero',
    'top-1: 0/1',
    'failed: 1 error(s)'
  ])
})

test('a top-ranked zero score still misses the gate', () => {
  const report = CheckRun.of(SKILLS, [
    'a clinic appointment slot -> oo-assigning-responsibilities'
  ])
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/routing-cases.md: ' +
      'expected oo-assigning-responsibilities ' +
      'in the top 1 with a score above zero',
    'top-1: 1/1',
    'failed: 1 error(s)'
  ])
})

test('a passing check reports top-1', () => {
  const report = CheckRun.of(SKILLS, [
    'a clinic design -> oo-design'
  ])
  assert.equal(report.failed, false)
  assert.equal(report.lines()[0], 'top-1: 1/1')
})

test('a passing check counts the routing cases', () => {
  const report = CheckRun.of(SKILLS, [
    'a clinic design -> oo-design'
  ])
  assert.equal(report.lines().at(-1), 'ok 1 routing case(s)')
})

test('noise reports every skill worst first and never fails', () => {
  const report = CheckRun.of([
    new FakeSkill('oo-design', 'design'),
    new FakeSkill('oo-assigning-responsibilities', 'class own method')
  ], [
    'design a visit -> oo-design',
    'design a class -> oo-design',
    'design a class method -> oo-design',
    'class own method design -> oo-assigning-responsibilities'
  ], true)
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), [
    'top-1: 4/4',
    'noise: oo-assigning-responsibilities reached the top 3 ' +
      'for 2 case(s) it does not own',
    'noise: oo-design reached the top 3 ' +
      'for 1 case(s) it does not own',
    'ok 4 routing case(s)'
  ])
})
