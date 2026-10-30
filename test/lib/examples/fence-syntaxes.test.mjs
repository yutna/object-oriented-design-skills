import test from 'node:test'
import assert from 'node:assert/strict'

import { FenceSyntaxes } from
  '../../../scripts/lib/examples/fence-syntaxes.mjs'

const SYNTAXES = new FenceSyntaxes()

const CASES = [
  [
    'java',
    'record Duration(int minutes) { }',
    'record Duration(int minutes { }'
  ],
  [
    'kotlin',
    'data class Duration(val minutes: Int)',
    'data class Duration(val minutes: Int'
  ],
  [
    'ruby',
    'class Duration\n  def initialize(minutes)\n' +
      '    @minutes = minutes\n  end\nend',
    'class Duration\n  def initialize(minutes\n' +
      '    @minutes = minutes\nend'
  ],
  [
    'typescript',
    'class Duration { constructor(readonly minutes: number) {} }',
    'class Duration { constructor(readonly minutes number) {} }'
  ],
  [
    'javascript',
    'class Duration { #minutes = 0 }',
    'class Duration { #minutes = 0'
  ],
  [
    'csharp',
    'public sealed record Duration(int Minutes);',
    'public sealed record Duration(int Minutes;'
  ],
  [
    'python',
    'class Duration:\n    minutes: int',
    'class Duration\n    minutes: int'
  ],
  [
    'json',
    '{"minutes": 15}',
    '{"minutes": 15,}'
  ]
]

for (const [tag, good, broken] of CASES) {
  test(`${tag} parses its good fence`, async () => {
    assert.deepEqual(await SYNTAXES.problems(tag, good), [])
  })

  test(`${tag} reports one problem in its broken fence`, async () => {
    const problems = await SYNTAXES.problems(tag, broken)
    assert.equal(problems.length, 1)
  })
}

test('typescript also runs the compiler syntax check', async () => {
  const problems = await SYNTAXES.problems(
    'typescript',
    'let x: number = 017;')
  assert.equal(problems.length, 1)
  assert.match(problems[0].message, /^TS1121 /)
})

test('ts behaves as typescript', async () => {
  assert.deepEqual(
    await SYNTAXES.problems(
      'ts',
      'class Duration { constructor(readonly minutes: number) {} }'),
    [])
  const problems = await SYNTAXES.problems(
    'ts',
    'class Duration { constructor(readonly minutes number) {} }')
  assert.equal(problems.length, 1)
})

test('js behaves as javascript', async () => {
  assert.deepEqual(
    await SYNTAXES.problems('js', 'class Duration { #minutes = 0 }'),
    [])
  const problems = await SYNTAXES.problems(
    'js',
    'class Duration { #minutes = 0')
  assert.equal(problems.length, 1)
})

test('knows every shipped tag and no other tag', () => {
  for (const tag of [
    'java',
    'kotlin',
    'ruby',
    'typescript',
    'ts',
    'javascript',
    'js',
    'csharp',
    'python',
    'json'
  ]) {
    assert.equal(SYNTAXES.knows(tag), true)
  }
  assert.equal(SYNTAXES.knows('sh'), false)
})
