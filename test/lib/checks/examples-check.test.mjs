import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { ExamplesCheck } from
  '../../../scripts/lib/checks/examples-check.mjs'
import { FenceSyntaxes } from
  '../../../scripts/lib/examples/fence-syntaxes.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

const SKILL = 'plugins/core/skills/oo-example/SKILL.md'

class CheckRun {
  static async over(files) {
    const root = mkdtempSync(join(tmpdir(), 'oo-examples-'))
    try {
      for (const [path, text] of Object.entries(files)) {
        const target = join(root, path)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, text)
      }
      const report = new Report()
      await new ExamplesCheck(
        Repository.at(root),
        new FenceSyntaxes()).inspect(report)
      return report
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
}

test('a broken java fence is an error at its opening line', async () => {
  const report = await CheckRun.over({
    [SKILL]: [
      '# Skill',
      '',
      '```java',
      'record Duration(int minutes { }',
      '```',
      ''
    ].join('\n')
  })
  const lines = report.lines()
  assert.equal(report.failed, true)
  assert.equal(lines.length, 2)
  assert.match(
    lines[0],
    /^error plugins\/core\/skills\/oo-example\/SKILL\.md: line 3: /)
  assert.match(
    lines[0],
    /line 3: java fence does not parse at \d+:\d+: /)
  assert.equal(lines[1], 'failed: 1 error(s)')
})

test('an unknown tag under plugins is an error', async () => {
  const report = await CheckRun.over({
    [SKILL]: ['```jav', 'class Duration {}', '```', ''].join('\n')
  })
  assert.deepEqual(report.lines(), [
    `error ${SKILL}: line 1: ` +
      'fence tag jav is not one the examples check parses',
    'failed: 1 error(s)'
  ])
})

test('an unknown tag outside plugins is skipped and not counted', async () => {
  const report = await CheckRun.over({
    'README.md': ['```jav', 'class Duration {}', '```', ''].join('\n')
  })
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 example fence(s))'
  ])
})

test('an untagged fence under plugins is an error', async () => {
  const report = await CheckRun.over({
    [SKILL]: ['```', 'class Duration {}', '```', ''].join('\n')
  })
  assert.deepEqual(report.lines(), [
    `error ${SKILL}: line 1: fence has no language tag`,
    'failed: 1 error(s)'
  ])
})

test('a js fence indented inside a list item is parsed and counted', async () => {
  const report = await CheckRun.over({
    'README.md': [
      '# Notes',
      '',
      '- a list item',
      '',
      '  ```js',
      '  class Duration { #minutes = 0 }',
      '  ```',
      ''
    ].join('\n')
  })
  assert.deepEqual(report.lines(), ['ok 1 example fence(s)'])
})

test('no fence of a known tag fails as measured nothing', async () => {
  const report = await CheckRun.over({
    'README.md': ['```text', 'class Duration', '```', ''].join('\n')
  })
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 example fence(s))'
  ])
})
