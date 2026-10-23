import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CountsCheck } from '../../../scripts/lib/checks/counts-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const INDEX_PATH = 'plugins/core/skills/oo-design/SKILL.md'
const README_PATH = 'evals/README.md'
const ROUTING_PATH = 'evals/routing-cases.md'
const SCENARIO_PATH = 'evals/scenarios.md'

const INDEX = [
  '# Object-Oriented Design',
  '',
  '## How strictly a rule is meant',
  '',
  'Every core rule in this pack carries one of three labels, and the label',
  'says how strictly it is meant.',
  '',
  '- **Rule.** Breaking it is a defect.',
  '- **Default.** Do this unless a condition holds.',
  '- **Judgement.** Two answers are defensible.',
  '',
  '## Symptoms to skills',
  ''
].join('\n')

const README = [
  '# Evals',
  '',
  '`routing-cases.md` holds 11 routing cases.',
  '',
  '`scenarios.md` holds 3 scenarios.',
  '',
  '`tasks/` holds 3 task cases.',
  ''
].join('\n')

const ROUTING = [
  '# Routing Cases',
  '',
  '```text',
  'one -> oo-design',
  'two -> oo-design',
  'three -> oo-design',
  'four -> oo-design',
  'five -> oo-design',
  'six -> oo-design',
  'seven -> oo-design',
  'eight -> oo-design',
  'nine -> oo-design',
  'ten -> oo-design',
  'eleven -> oo-design',
  '```',
  ''
].join('\n')

const SCENARIOS = [
  '# Scenarios',
  '',
  '## 1. One',
  '',
  '> A clinic prompt.',
  '',
  'Must contain: one thing.',
  '',
  'Should reach `oo-design`.',
  '',
  '## 2. Two',
  '',
  '> A clinic prompt.',
  '',
  'Must contain: one thing.',
  '',
  'Should reach `oo-design`.',
  '',
  '## 3. Three',
  '',
  '> A clinic prompt.',
  '',
  'Must contain: one thing.',
  '',
  'Should reach `oo-design`.',
  ''
].join('\n')

class FakeRepository {
  #files
  #root

  constructor(files, root) {
    this.#files = new Map(files)
    this.#root = root
  }

  get root() {
    return this.#root
  }

  file(path) {
    return this.#files.get(path)
  }
}

class CheckRun {
  static of(readme = README) {
    const files = [
      [INDEX_PATH, INDEX],
      [README_PATH, readme],
      [ROUTING_PATH, ROUTING],
      [SCENARIO_PATH, SCENARIOS]
    ].map(([path, text]) => [path, new TextFile(path, text)])
    const root = mkdtempSync(join(tmpdir(), 'oo-counts-'))
    try {
      const tasks = join(root, 'evals', 'tasks')
      mkdirSync(tasks, { recursive: true })
      for (const name of ['a01-one.yaml', 'b02-two.yaml', 'c03-three.yaml']) {
        writeFileSync(join(tasks, name), '{}\n')
      }
      const report = new Report()
      new CountsCheck(new FakeRepository(files, root)).inspect(report)
      return report
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
}

test('a matching claim counts the claims', () => {
  const report = CheckRun.of()
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), ['ok 4 claim(s)'])
})

test('a stale number names the file, number and fact', () => {
  const report = CheckRun.of(
    README.replace('holds 11 routing cases', 'holds 12 routing cases'))
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/README.md: stated 12 but the fact is 11',
    'failed: 1 error(s)'
  ])
})

test('a missing claim sentence is an error', () => {
  const report = CheckRun.of(
    README.replace('holds 3 scenarios', 'contains 3 scenarios'))
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/README.md: ' +
      'claim not found: /holds (\\S+) scenarios/',
    'failed: 1 error(s)'
  ])
})

test('a missing task-case claim is an error', () => {
  const report = CheckRun.of(
    README.replace('holds 3 task cases', 'contains 3 task cases'))
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error evals/README.md: ' +
      'claim not found: /holds (\\S+) task cases/',
    'failed: 1 error(s)'
  ])
})
