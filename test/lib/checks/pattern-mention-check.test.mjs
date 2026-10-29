import test from 'node:test'
import assert from 'node:assert/strict'

import { PatternMentionCheck } from '../../../scripts/lib/checks/pattern-mention-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const INDEX_PATH =
  'plugins/core/skills/oo-design/references/pattern-index.md'
const SKILL_PATH = 'plugins/core/skills/oo-other/SKILL.md'
const ALPHA_PATH = 'plugins/core/skills/oo-alpha/SKILL.md'
const ZETA_PATH = 'plugins/core/skills/oo-zeta/SKILL.md'

const BASE_INDEX = [
  '# Pattern index',
  '',
  '- **Adapter.** Answers an outside interface. [Other][other]',
  '',
  '[other]: ../../oo-other/SKILL.md',
  ''
].join('\n')

class FakeRepository {
  #files
  #root = '/repo'

  constructor(files) {
    this.#files = new Map(files.map(([path, text]) => [
      path,
      new TextFile(`${this.#root}/${path}`, `${text}\n`)
    ]))
  }

  get root() {
    return this.#root
  }

  exists(path) {
    return this.#files.has(path)
  }

  file(path) {
    return this.#files.get(path)
  }

  markdownFiles() {
    return [...this.#files.values()]
  }
}

class CheckRun {
  static of({
    index = BASE_INDEX,
    files = [[SKILL_PATH, 'Nothing here.']],
    hasIndex = true
  } = {}) {
    const allFiles = [...files]
    if (hasIndex) allFiles.push([INDEX_PATH, index])
    const report = new Report()
    new PatternMentionCheck(new FakeRepository(allFiles)).inspect(report)
    return report
  }
}

test('PatternMentionCheck reports a used name with no index item', () => {
  const report = CheckRun.of({
    files: [[SKILL_PATH, 'The clinic publishes through a Message Bus.']]
  })
  assert.deepEqual(report.lines(), [
    `error ${SKILL_PATH}:1: pattern index: "Message Bus" is named in the ` +
    'pack but has no entry',
    'failed: 1 error(s)'
  ])
})

test('PatternMentionCheck accepts a used name that has an index item', () => {
  const index = BASE_INDEX.replace(
    '- **Adapter.** Answers an outside interface. [Other][other]',
    '- **Adapter.** Answers an outside interface. [Other][other]\n' +
    '- **Message Bus.** Answers a shared channel. [Other][other]')
  const report = CheckRun.of({
    index,
    files: [[SKILL_PATH, 'The clinic publishes through a Message Bus.']]
  })
  assert.deepEqual(report.lines(), ['ok 119 vocabulary name(s)'])
})

test('PatternMentionCheck compares an index item without case', () => {
  const index = BASE_INDEX.replace(
    '- **Adapter.** Answers an outside interface. [Other][other]',
    '- **Adapter.** Answers an outside interface. [Other][other]\n' +
    '- **MESSAGE BUS.** Answers a shared channel. [Other][other]')
  const report = CheckRun.of({
    index,
    files: [[SKILL_PATH, 'The clinic publishes through a Message Bus.']]
  })
  assert.deepEqual(report.lines(), ['ok 119 vocabulary name(s)'])
})

test('PatternMentionCheck reports the first file in path order', () => {
  const report = CheckRun.of({
    files: [
      [ZETA_PATH, 'A Message Bus carries the reminder.'],
      [ALPHA_PATH, 'Nothing here.\nA Message Bus carries the reminder.']
    ]
  })
  assert.deepEqual(report.lines(), [
    `error ${ALPHA_PATH}:2: pattern index: "Message Bus" is named in the ` +
    'pack but has no entry',
    'failed: 1 error(s)'
  ])
})

test('PatternMentionCheck does not report a name the pack never uses', () => {
  const report = CheckRun.of()
  assert.deepEqual(report.lines(), ['ok 119 vocabulary name(s)'])
})

test('PatternMentionCheck stays silent when the index is missing', () => {
  const report = CheckRun.of({
    hasIndex: false,
    files: [[SKILL_PATH, 'The clinic publishes through a Message Bus.']]
  })
  assert.deepEqual(report.lines(), ['failed: measured nothing'])
})
