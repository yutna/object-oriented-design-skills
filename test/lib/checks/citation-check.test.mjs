import test from 'node:test'
import assert from 'node:assert/strict'

import { CitationCheck } from '../../../scripts/lib/checks/citation-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'plugins/core/skills/oo-design/SKILL.md'

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
    new CitationCheck(new FakeRepository([file])).inspect(report)
    return report
  }
}

const ERROR = `error ${PATH}:1: citation mark: `

test('CitationCheck rejects ISBN', () => {
  const report = CheckRun.of('The book gives ISBN 978-0-13-235088-4.')
  assert.deepEqual(report.lines(), [
    `${ERROR}ISBN`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects et al.', () => {
  const report = CheckRun.of('The rule comes from Fowler et al. 1999.')
  assert.deepEqual(report.lines(), [
    `${ERROR}et al.`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects op. cit.', () => {
  const report = CheckRun.of('See the earlier note, op. cit.')
  assert.deepEqual(report.lines(), [
    `${ERROR}op. cit.`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects ibid.', () => {
  const report = CheckRun.of('The same point again, ibid.')
  assert.deepEqual(report.lines(), [
    `${ERROR}ibid.`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects a chapter number', () => {
  const report = CheckRun.of('Chapter 4 describes it.')
  assert.deepEqual(report.lines(), [
    `${ERROR}Chapter 4`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects an edition number', () => {
  const report = CheckRun.of('The 2nd edition says so.')
  assert.deepEqual(report.lines(), [
    `${ERROR}2nd edition`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects a year in the 1800s', () => {
  const report = CheckRun.of('Published (1899).')
  assert.deepEqual(report.lines(), [
    `${ERROR}(1899)`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects a year in the 1900s', () => {
  const report = CheckRun.of('Published (1999).')
  assert.deepEqual(report.lines(), [
    `${ERROR}(1999)`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects a year in the 2000s', () => {
  const report = CheckRun.of('Published (2004).')
  assert.deepEqual(report.lines(), [
    `${ERROR}(2004)`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects a section number', () => {
  const report = CheckRun.of(
    'Section 3.10.2 sets the spacing that section 3 describes.')
  assert.deepEqual(report.lines(), [
    `${ERROR}Section 3.10.2`,
    `${ERROR}section 3`,
    'failed: 2 error(s)'
  ])
})

test('CitationCheck rejects the documentation', () => {
  const report = CheckRun.of('The documentation explains it.')
  assert.deepEqual(report.lines(), [
    `${ERROR}The documentation`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects the docs', () => {
  const report = CheckRun.of('The docs explain it.')
  assert.deepEqual(report.lines(), [
    `${ERROR}The docs`,
    'failed: 1 error(s)'
  ])
})

test('CitationCheck rejects a guide that says', () => {
  const report = CheckRun.of(
    'The specification recommends it and the guide says so.')
  assert.deepEqual(report.lines(), [
    `${ERROR}specification recommends`,
    `${ERROR}guide says`,
    'failed: 2 error(s)'
  ])
})

test('CitationCheck ignores a mark inside backticks', () => {
  const report = CheckRun.of(
    'The check looks for `ISBN` and `Chapter 4` in prose.')
  assert.deepEqual(report.lines(), ['ok 1 prose file(s)'])
})

test('CitationCheck ignores the new marks inside backticks', () => {
  const report = CheckRun.of(
    'The check looks for `section 3`, `the documentation`, ' +
    '`the docs` and `guide says` in prose.')
  assert.deepEqual(report.lines(), ['ok 1 prose file(s)'])
})

test('CitationCheck accepts prose that names no source', () => {
  const report = CheckRun.of(
    'This section explains why documentation comments help.')
  assert.deepEqual(report.lines(), ['ok 1 prose file(s)'])
})
