import test from 'node:test'
import assert from 'node:assert/strict'

import { PluginEvalRun } from '../../../scripts/lib/evals/plugin-eval-run.mjs'

class CaseFixture {
  static question(name) {
    return { name, family: 'question', tags: ['question'] }
  }

  static task(name, family = 'task') {
    return { name, family, tags: [family] }
  }
}

test('question cases and task cases never share a piece', () => {
  const pieces = PluginEvalRun.pieces([
    CaseFixture.question('q01-the-slot-rule-keeps-moving'),
    CaseFixture.question('q02-an-appointment-crosses-midnight'),
    CaseFixture.task('t01-check-before-booking'),
    CaseFixture.task('r01-overnight-duration', 'restraint')
  ])
  assert.deepEqual(
    pieces.map((piece) => ({
      name: piece.name,
      cases: piece.cases.map(({ name }) => name)
    })),
    [
      {
        name: 'questions',
        cases: [
          'q01-the-slot-rule-keeps-moving',
          'q02-an-appointment-crosses-midnight'
        ]
      },
      {
        name: 'tasks',
        cases: ['t01-check-before-booking', 'r01-overnight-duration']
      }
    ])
})

test('a piece holds at most six cases', () => {
  const cases = Array.from({ length: 8 }, (unused, index) =>
    CaseFixture.question(`q${String(index + 1).padStart(2, '0')}-case`))
  const pieces = PluginEvalRun.pieces(cases)
  assert.deepEqual(
    pieces.map((piece) => piece.cases.map(({ name }) => name)),
    [
      cases.slice(0, 6).map(({ name }) => name),
      cases.slice(6).map(({ name }) => name)
    ])
})
