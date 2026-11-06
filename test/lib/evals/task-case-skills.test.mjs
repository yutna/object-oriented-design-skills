import test from 'node:test'
import assert from 'node:assert/strict'

import { TaskCaseSkills } from
  '../../../scripts/lib/evals/task-case-skills.mjs'

class GraderFixture {
  static skill(inputMatch) {
    return {
      name: 'loaded-skill',
      type: 'tool_used',
      tool: 'Skill',
      input_match: inputMatch
    }
  }

  static other(inputMatch) {
    return {
      name: 'some-other-grader',
      type: 'tool_used',
      tool: 'Read',
      input_match: inputMatch
    }
  }
}

test('a Skill grader names a skill by its whole name', () => {
  const skills = new TaskCaseSkills({
    graders: [
      GraderFixture.skill(
        '"skill"\\s*:\\s*"(?:[\\w-]+:)?oo-java"')
    ]
  })
  assert.equal(skills.names('oo-java'), true)
  assert.equal(skills.names('oo-javascript'), false)
  assert.equal(skills.names('oo-java-extra'), false)
})

test('a grader that is not a Skill grader names no skill', () => {
  const skills = new TaskCaseSkills({
    graders: [GraderFixture.other('oo-java')]
  })
  assert.equal(skills.names('oo-java'), false)
})

test('an input match that is not text names no skill', () => {
  const skills = new TaskCaseSkills({
    graders: [GraderFixture.skill(null)]
  })
  assert.equal(skills.names('oo-java'), false)
})
