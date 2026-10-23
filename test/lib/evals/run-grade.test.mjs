import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { RunGrade } from '../../../scripts/lib/evals/run-grade.mjs'

class Fixture {
  static #ROOT = join(process.cwd(), 'test', 'fixtures')

  static result() {
    return JSON.parse(readFileSync(
      join(Fixture.#ROOT, 'aggregate-result.json'), 'utf8'))
  }

  static run() {
    return Fixture.result().cases[0].arms.with[0]
  }

  static trace() {
    return readFileSync(
      join(Fixture.#ROOT, 'skill-trace.jsonl'), 'utf8')
  }

  static assistant(parts) {
    return { type: 'assistant', message: { content: parts } }
  }

  static user(parts) {
    return { type: 'user', message: { content: parts } }
  }

  static toolUse(id, name, input) {
    return { type: 'tool_use', id, name, input }
  }

  static toolResult(id, isError) {
    return { type: 'tool_result', tool_use_id: id, is_error: isError }
  }

  static lines(...events) {
    return events.map((event) => JSON.stringify(event)).join('\n')
  }
}

class RunFixture {
  static copy() {
    return structuredClone(Fixture.run())
  }

  static grader(run, name) {
    return run.graders.find((candidate) => candidate.name === name)
  }
}

test('passed is computed from graders, never from the tool', () => {
  const run = RunFixture.copy()
  run.passed = true
  RunFixture.grader(run, 'substance').passed = false
  assert.equal(new RunGrade(run, '').passed, false)

  const reverse = RunFixture.copy()
  reverse.passed = false
  RunFixture.grader(reverse, 'substance').passed = true
  RunFixture.grader(
    reverse, 'loaded-oo-assigning-responsibilities').passed = false
  RunFixture.grader(
    reverse, 'read-oo-assigning-responsibilities').passed = false
  assert.equal(new RunGrade(reverse, '').passed, true)
})

test('a run is graded, unjudged or errored', () => {
  assert.equal(new RunGrade(RunFixture.copy(), '').state, 'graded')

  const unjudged = RunFixture.copy()
  RunFixture.grader(unjudged, 'substance').judgeVotes = []
  assert.equal(new RunGrade(unjudged, '').state, 'unjudged')

  const errored = RunFixture.copy()
  errored.error = 'the account reached its session limit'
  assert.equal(new RunGrade(errored, '').state, 'errored')
})

test('skillsLoaded holds only Skill calls the tool did not refuse', () => {
  const refused = Fixture.lines(
    Fixture.assistant([
      Fixture.toolUse('toolu_refused', 'Skill', {
        skill: 'object-oriented-design-skills:oo-design'
      })
    ]),
    Fixture.user([
      Fixture.toolResult('toolu_refused', true)
    ]))
  const unanswered = Fixture.lines(
    Fixture.assistant([
      Fixture.toolUse('toolu_unanswered', 'Skill', {
        skill: 'object-oriented-design-skills:oo-design'
      })
    ]))
  const grade = new RunGrade(
    RunFixture.copy(),
    [Fixture.trace(), refused, unanswered].join('\n'))

  assert.deepEqual(
    grade.skillsLoaded,
    ['oo-assigning-responsibilities'])
})

test('skillFilesRead holds a Read of a SKILL.md', () => {
  const trace = Fixture.lines(
    Fixture.assistant([
      Fixture.toolUse('toolu_read_skill', 'Read', {
        file_path: '/repo/plugins/core/skills/oo-design/SKILL.md'
      }),
      Fixture.toolUse('toolu_read_code', 'Read', {
        file_path: '/repo/plugins/core/skills/oo-design/references/notation.md'
      })
    ]))
  const grade = new RunGrade(RunFixture.copy(), trace)

  assert.deepEqual(grade.skillFilesRead, ['oo-design'])
})
