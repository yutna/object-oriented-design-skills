import test from 'node:test'
import assert from 'node:assert/strict'

import { TaskCase } from '../../../scripts/lib/evals/task-case.mjs'

class CaseValue {
  static of(changes = {}) {
    const fields = {
      name: 't01-check-before-booking',
      fileName: 't01-check-before-booking.yaml',
      schemaVersion: '1.1',
      tags: ['task', 'smoke'],
      scaffold: 'fixture.sh',
      allowedTools: ['Read', 'Skill', 'Edit'],
      graders: [
        { name: 'loaded-any-skill', type: 'tool_used', tool: 'Skill' }
      ],
      ...changes
    }
    return new TaskCase(
      fields.name,
      fields.fileName,
      fields.schemaVersion,
      fields.tags,
      fields.scaffold,
      fields.allowedTools,
      fields.graders)
  }
}

test('TaskCase is frozen and compares by value', () => {
  const testCase = CaseValue.of()
  assert.equal(Object.isFrozen(testCase), true)
  assert.equal(Object.isFrozen(testCase.tags), true)
  assert.equal(Object.isFrozen(testCase.allowedTools), true)
  assert.equal(Object.isFrozen(testCase.graders), true)
  assert.equal(Object.isFrozen(testCase.graders[0]), true)
  assert.equal(testCase.equals(CaseValue.of()), true)
  assert.equal(testCase.equals(CaseValue.of({ name: 'other' })), false)
  assert.equal(testCase.equals(CaseValue.of({
    tags: ['restraint', 'smoke']
  })), false)
  assert.equal(testCase.equals(CaseValue.of({
    graders: [
      { name: 'loaded-any-skill', type: 'tool_used', tool: 'Read' }
    ]
  })), false)
  assert.equal(testCase.equals({ name: testCase.name }), false)
})
