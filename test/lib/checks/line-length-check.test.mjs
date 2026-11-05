import test from 'node:test'
import assert from 'node:assert/strict'

import { LineLengthCheck } from
  '../../../scripts/lib/checks/line-length-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'evals/README.md'

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

class Fixture {
  static #LINK = '[the index](plugins/core/skills/oo-design/SKILL.md)'

  static lineOf(length, lastSpaceColumn, start = '') {
    const body = start + 'x'.repeat(
      lastSpaceColumn - 1 - start.length)
    return `${body} ${'y'.repeat(length - lastSpaceColumn)}`
  }

  static linkedLine(length, lastSpaceColumn) {
    return Fixture.lineOf(
      length,
      lastSpaceColumn,
      `See ${Fixture.#LINK}.`)
  }

  static longLine() {
    return Fixture.lineOf(150, 120, 'description: ')
  }
}

class CheckRun {
  static of(text) {
    return CheckRun.ofFiles([
      new TextFile(`/repo/${PATH}`, `${text}\n`)
    ])
  }

  static ofFiles(files) {
    const report = new Report()
    new LineLengthCheck(new FakeRepository(files)).inspect(report)
    return report
  }
}

const ERROR = `error ${PATH}:`

test('a link line with a space after column 80 fails', () => {
  const line = Fixture.linkedLine(86, 84)
  assert.equal(line.length, 86)
  const report = CheckRun.of(line)
  assert.deepEqual(report.lines(), [
    `${ERROR}1: line is 86 characters with a space after column 80`,
    'failed: 1 error(s)'
  ])
})

test('a long line whose last space is at column 80 passes', () => {
  const line = Fixture.lineOf(120, 80)
  assert.equal(line.length, 120)
  const report = CheckRun.of(line)
  assert.deepEqual(report.lines(), ['ok 1 markdown file(s)'])
})

test('a long description line in frontmatter passes', () => {
  const report = CheckRun.of([
    '---',
    'name: fixture',
    Fixture.longLine(),
    '---',
    '# Fixture'
  ].join('\n'))
  assert.deepEqual(report.lines(), ['ok 1 markdown file(s)'])
})

test('the same long line below frontmatter fails', () => {
  const report = CheckRun.of([
    '---',
    'name: fixture',
    '---',
    Fixture.longLine()
  ].join('\n'))
  assert.deepEqual(report.lines(), [
    `${ERROR}4: line is 150 characters with a space after column 80`,
    'failed: 1 error(s)'
  ])
})

test('a long line inside a code fence fails', () => {
  const report = CheckRun.of([
    '# Fixture',
    '```text',
    Fixture.longLine(),
    '```'
  ].join('\n'))
  assert.deepEqual(report.lines(), [
    `${ERROR}3: line is 150 characters with a space after column 80`,
    'failed: 1 error(s)'
  ])
})

test('a repository with no Markdown file fails as measured nothing', () => {
  const report = CheckRun.ofFiles([])
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 markdown file(s))'
  ])
})
