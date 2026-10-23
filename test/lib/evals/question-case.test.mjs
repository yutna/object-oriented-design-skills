import test from 'node:test'
import assert from 'node:assert/strict'

import { QuestionCase } from '../../../scripts/lib/evals/question-case.mjs'
import { Scenario } from '../../../scripts/lib/evals/scenario.mjs'

class Rubric {
  static INSTRUCTION = 'Grade the final answer only. PASS if it makes every ' +
    'point below, in any words; FAIL if any point is missing. Points:'

  static SYSTEM = 'The code the user describes is not in this workspace; ' +
    'answer from the description.'
}

class ScenarioFixture {
  static slotRule() {
    return new Scenario(
      1,
      'The slot rule keeps moving',
      'Our `AppointmentScheduler` checks `slot.patientId` before it books, ' +
      'and the appointment controller repeats the same check. Where should ' +
      'that decision live?',
      'the check moving to the object that holds the slot\'s booking data;\n' +
      'neither the scheduler nor the controller deciding it from the ' +
      'slot\'s fields itself;\none owner for the rule.',
      ['oo-assigning-responsibilities'])
  }
}

class IndicatorPattern {
  static loaded(skill) {
    return `"skill"\\s*:\\s*"(?:[\\w-]+:)?${skill}"`
  }

  static read(skill) {
    return `"file_path"\\s*:\\s*"[^"]*/${skill}/SKILL\\.md"`
  }
}

test('QuestionCase turns a scenario into the exact eval case', () => {
  const scenario = ScenarioFixture.slotRule()
  const testCase = new QuestionCase(scenario)
  const skill = 'oo-assigning-responsibilities'
  assert.equal(testCase.name, 'q01-the-slot-rule-keeps-moving')
  assert.equal(testCase.family, 'question')
  assert.deepEqual(testCase.tags, ['question'])
  assert.equal(testCase.prompt, scenario.prompt)
  assert.equal(testCase.appendSystemPrompt, Rubric.SYSTEM)
  assert.deepEqual(
    testCase.allowedTools, ['Read', 'Glob', 'Grep', 'Skill'])
  assert.deepEqual(testCase.graders, [
    {
      name: 'substance',
      type: 'llm',
      criteria: `${Rubric.INSTRUCTION}\n${scenario.mustContain}`
    },
    {
      name: `loaded-${skill}`,
      type: 'tool_used',
      tool: 'Skill',
      input_match: IndicatorPattern.loaded(skill)
    },
    {
      name: `read-${skill}`,
      type: 'tool_used',
      tool: 'Read',
      input_match: IndicatorPattern.read(skill),
      arm: 'with-only'
    }
  ])
  assert.deepEqual(testCase.document(), {
    schema_version: '1.1',
    name: 'q01-the-slot-rule-keeps-moving',
    tags: ['question'],
    execution: {
      prompt: scenario.prompt,
      allowed_tools: ['Read', 'Glob', 'Grep', 'Skill'],
      append_system_prompt: Rubric.SYSTEM
    },
    graders: [
      {
        name: 'substance',
        type: 'llm',
        criteria: `${Rubric.INSTRUCTION}\n${scenario.mustContain}`
      },
      {
        name: `loaded-${skill}`,
        type: 'tool_used',
        tool: 'Skill',
        input_match: IndicatorPattern.loaded(skill)
      },
      {
        name: `read-${skill}`,
        type: 'tool_used',
        tool: 'Read',
        input_match: IndicatorPattern.read(skill),
        arm: 'with-only'
      }
    ]
  })
})

test('QuestionCase gives every reached skill both indicators', () => {
  const testCase = new QuestionCase(new Scenario(
    2,
    'The visit class that does everything',
    'Our visit class books and reminds.',
    'the jobs split apart.',
    ['oo-design', 'oo-assigning-responsibilities']))
  assert.deepEqual(
    testCase.graders.map(({ name, tool, arm }) => [name, tool, arm ?? null]),
    [
      ['substance', undefined, null],
      ['loaded-oo-design', 'Skill', null],
      ['read-oo-design', 'Read', 'with-only'],
      ['loaded-oo-assigning-responsibilities', 'Skill', null],
      ['read-oo-assigning-responsibilities', 'Read', 'with-only']
    ])
})

test('QuestionCase pads the number and slugs the title', () => {
  const testCase = new QuestionCase(new Scenario(
    7,
    'A one-line fix, maybe!',
    'The fix is one line.',
    'changing the method body and stopping there.',
    ['oo-design']))
  assert.equal(testCase.name, 'q07-a-one-line-fix-maybe')
})
