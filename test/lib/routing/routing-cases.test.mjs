import test from 'node:test'
import assert from 'node:assert/strict'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'
import { RoutingCases } from '../../../scripts/lib/routing/routing-cases.mjs'

test('RoutingCases reads the cases from the text fence', () => {
  const text = [
    '# Routing Cases',
    '',
    '```js',
    'ignored -> oo-design',
    '```',
    '',
    '```text',
    'a clinic visit needs a design -> oo-design',
    'which class owns the reminder -> oo-assigning-responsibilities',
    'a symptom with -> an arrow -> oo-design',
    '```',
    ''
  ].join('\n')
  const cases = RoutingCases.of(
    new TextFile('evals/routing-cases.md', text))
  assert.equal(Object.isFrozen(cases), true)
  assert.deepEqual(
    cases.map(({ symptom, expected }) => [symptom, expected]),
    [
      ['a clinic visit needs a design', 'oo-design'],
      ['which class owns the reminder', 'oo-assigning-responsibilities'],
      ['a symptom with -> an arrow', 'oo-design']
    ])
})

test('RoutingCases reports the file and line when a case has no arrow', () => {
  const text = [
    '# Routing Cases',
    '',
    '```text',
    'a clinic visit -> oo-design',
    'a line with no arrow',
    '```',
    ''
  ].join('\n')
  const file = new TextFile('evals/routing-cases.md', text)
  assert.throws(() => RoutingCases.of(file), (error) =>
    error instanceof RepoError &&
    error.message.includes('evals/routing-cases.md:5'))
})
