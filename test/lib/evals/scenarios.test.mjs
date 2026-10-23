import test from 'node:test'
import assert from 'node:assert/strict'

import { Scenarios } from '../../../scripts/lib/evals/scenarios.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

class ScenarioFile {
  static of(lines) {
    return new TextFile('evals/scenarios.md', [
      '# Scenarios',
      '',
      'A test file.',
      '',
      ...lines,
      ''
    ].join('\n'))
  }
}

test('Scenarios reads the numbered blocks', () => {
  const scenarios = Scenarios.of(ScenarioFile.of([
    '## 1. The slot rule keeps moving',
    '',
    '> Our appointment controller decides whether a slot is free.',
    '> It repeats the check in the scheduler.',
    '',
    'Must contain: the check moving to the object that holds the slot;',
    'the controller asking that object.',
    '',
    'Should reach `oo-assigning-responsibilities`.',
    '',
    '## 2. A one-line fix',
    '',
    '> Appointment.total() forgets the discount, and the fix is one line.',
    '',
    'Must contain: changing the method body and stopping there.',
    '',
    'Should reach `oo-design`.'
  ]))
  assert.equal(Object.isFrozen(scenarios), true)
  assert.deepEqual(
    scenarios.map(({ number, title, prompt, mustContain, skills }) => [
      number, title, prompt, mustContain, skills
    ]),
    [
      [
        1,
        'The slot rule keeps moving',
        'Our appointment controller decides whether a slot is free.\n' +
        'It repeats the check in the scheduler.',
        'the check moving to the object that holds the slot;\n' +
        'the controller asking that object.',
        ['oo-assigning-responsibilities']
      ],
      [
        2,
        'A one-line fix',
        'Appointment.total() forgets the discount, and the fix is one line.',
        'changing the method body and stopping there.',
        ['oo-design']
      ]
    ])
})

test('Scenarios leaves a missing Must contain paragraph empty', () => {
  const [scenario] = Scenarios.of(ScenarioFile.of([
    '## 1. A visit class doing too much',
    '',
    '> Our visit class books, reminds and invoices.',
    '',
    'Should reach `oo-assigning-responsibilities`.'
  ]))
  assert.equal(scenario.mustContain, '')
  assert.deepEqual(scenario.skills, ['oo-assigning-responsibilities'])
})
