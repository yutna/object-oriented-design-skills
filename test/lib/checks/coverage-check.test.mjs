import test from 'node:test'
import assert from 'node:assert/strict'

import { CoverageCheck } from '../../../scripts/lib/checks/coverage-check.mjs'
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

class CoverageFiles {
  static routing(lines, knownMisses = []) {
    return new TextFile(
      'evals/routing-cases.md',
      ['# Routing Cases', '', '```text', ...lines, '```', '',
        '## Known misses', '', '```text', ...knownMisses, '```', '']
        .join('\n'))
  }

  static scenarios(reached) {
    const lines = ['# Scenarios', '']
    for (const [index, skills] of reached.entries()) {
      lines.push(
        `## ${index + 1}. A clinic problem`,
        '',
        '> A clinic prompt.',
        '',
        'Must contain: one thing.',
        '',
        `Should reach ${skills
          .map((skill) => `\`${skill}\``).join(', ')}.`,
        '')
    }
    return new TextFile('evals/scenarios.md', lines.join('\n'))
  }
}

class FakeRepository {
  #skills
  #files

  constructor(skills, files) {
    this.#skills = Object.freeze([...skills])
    this.#files = new Map(files)
    Object.freeze(this)
  }

  skills() {
    return this.#skills
  }

  file(path) {
    assert.ok(this.#files.has(path), `unexpected file: ${path}`)
    return this.#files.get(path)
  }
}

class CheckRun {
  static of(skillNames, routing, scenarios) {
    const report = new Report()
    new CoverageCheck(new FakeRepository(
      skillNames.map((name) => new FakeSkill(name)),
      [
        ['evals/routing-cases.md', routing],
        ['evals/scenarios.md', scenarios]
      ])).inspect(report)
    return report
  }
}

test('coverage rejects a skill with one routing case', () => {
  const report = CheckRun.of(
    ['oo-design', 'oo-assigning-responsibilities'],
    CoverageFiles.routing([
      'a clinic design -> oo-design',
      'a visit class -> oo-assigning-responsibilities',
      'a slot rule -> oo-assigning-responsibilities'
    ]),
    CoverageFiles.scenarios([
      ['oo-design'],
      ['oo-assigning-responsibilities']
    ]))
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/routing-cases.md: ' +
      'oo-design has 1 routing case(s); at least 2',
    'failed: 1 error(s)'
  ])
})

test('coverage rejects a skill with no scenario', () => {
  const report = CheckRun.of(
    ['oo-design', 'oo-assigning-responsibilities'],
    CoverageFiles.routing([
      'a clinic design -> oo-design',
      'a small clinic change -> oo-design',
      'a visit class -> oo-assigning-responsibilities',
      'a slot rule -> oo-assigning-responsibilities'
    ]),
    CoverageFiles.scenarios([
      ['oo-assigning-responsibilities']
    ]))
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/scenarios.md: oo-design has no scenario',
    'failed: 1 error(s)'
  ])
})

test('coverage counts every skill that meets both minimums', () => {
  const report = CheckRun.of(
    ['oo-design', 'oo-assigning-responsibilities'],
    CoverageFiles.routing([
      'a clinic design -> oo-design',
      'a small clinic change -> oo-design',
      'a visit class -> oo-assigning-responsibilities',
      'a slot rule -> oo-assigning-responsibilities'
    ]),
    CoverageFiles.scenarios([
      ['oo-design'],
      ['oo-assigning-responsibilities']
    ]))
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), ['ok 2 skill(s) covered'])
})

test('a known miss counts toward the routing minimum', () => {
  const report = CheckRun.of(
    ['oo-design'],
    CoverageFiles.routing([
      'a clinic design -> oo-design'
    ], [
      'a small clinic change -> oo-design'
    ]),
    CoverageFiles.scenarios([
      ['oo-design']
    ]))
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), ['ok 1 skill(s) covered'])
})

test('coverage keeps both minimums as static fields', () => {
  assert.equal(CoverageCheck.MIN_ROUTING_CASES, 2)
  assert.equal(CoverageCheck.MIN_SCENARIOS, 1)
})
