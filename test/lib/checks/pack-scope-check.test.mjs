import test from 'node:test'
import assert from 'node:assert/strict'

import { PackScopeCheck } from
  '../../../scripts/lib/checks/pack-scope-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'plugins/core/skills/oo-design/SKILL.md'
const ERROR = `error ${PATH}:1: pack scope: say "outside this skill", ` +
  'not "'

class FakeRepository {
  #files

  constructor(files) {
    this.#files = Object.freeze([...files])
  }

  get root() {
    return '/repo'
  }

  markdownFiles() {
    return this.#files
  }
}

class CheckRun {
  static of(text) {
    const file = new TextFile(`/repo/${PATH}`, `${text}\n`)
    const report = new Report()
    new PackScopeCheck(new FakeRepository([file])).inspect(report)
    return report
  }

  static withNoFiles() {
    const report = new Report()
    new PackScopeCheck(new FakeRepository([])).inspect(report)
    return report
  }
}

test('PackScopeCheck rejects "outside this pack"', () => {
  const report = CheckRun.of(
    'The store stays outside this pack.')
  assert.deepEqual(report.lines(), [
    `${ERROR}outside this pack"`,
    'failed: 1 error(s)'
  ])
})

test('PackScopeCheck rejects "Outside the pack" in any case', () => {
  const report = CheckRun.of(
    'Outside the pack, the contract is the other team\'s.')
  assert.deepEqual(report.lines(), [
    `${ERROR}Outside the pack"`,
    'failed: 1 error(s)'
  ])
})

test('PackScopeCheck reports two matches on one line', () => {
  const report = CheckRun.of(
    'One stays outside this pack and the other outside the pack.')
  assert.deepEqual(report.lines(), [
    `${ERROR}outside this pack"`,
    `${ERROR}outside the pack"`,
    'failed: 2 error(s)'
  ])
})

test('PackScopeCheck passes "outside this skill"', () => {
  const report = CheckRun.of(
    'The store stays outside this skill.')
  assert.deepEqual(report.lines(), ['ok 1 prose file(s)'])
})

test('PackScopeCheck ignores the phrase inside inline code', () => {
  const report = CheckRun.of(
    'The forbidden words are `outside this pack` and `outside the pack`.')
  assert.deepEqual(report.lines(), ['ok 1 prose file(s)'])
})

test('PackScopeCheck ignores "outside this package"', () => {
  const report = CheckRun.of(
    'The dependency stays outside this package.')
  assert.deepEqual(report.lines(), ['ok 1 prose file(s)'])
})

test('PackScopeCheck fails when it reads no prose file', () => {
  const report = CheckRun.withNoFiles()
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 prose file(s))'
  ])
})
