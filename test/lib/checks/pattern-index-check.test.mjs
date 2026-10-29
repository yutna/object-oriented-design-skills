import test from 'node:test'
import assert from 'node:assert/strict'

import { PatternIndexCheck } from '../../../scripts/lib/checks/pattern-index-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const INDEX_PATH =
  'plugins/core/skills/oo-design/references/pattern-index.md'
const CATALOGUE_PATH = 'plugins/core/skills/' +
  'oo-choosing-a-pattern/references/patterns-by-problem.md'
const OTHER_PATH = 'plugins/core/skills/oo-other/SKILL.md'

const BASE_INDEX = [
  '# Pattern index',
  '',
  '- **Adapter.** Answers an outside interface. [Other][other]',
  '- **Bridge.** Answers two dimensions. [Other][other]',
  '- **Retry.** Answers a failure. [Other][other]',
  '',
  '[other]: ../../oo-other/SKILL.md',
  ''
].join('\n')

const BASE_CATALOGUE = [
  '# Patterns by problem',
  '',
  '- **Adapter.** An outside interface.',
  '- **Bridge.** Two dimensions.',
  '- **Retry.** A failure that may pass.',
  ''
].join('\n')

class FakeRepository {
  #files
  #root = '/repo'
  #skills = Object.freeze([
    Object.freeze({ directoryName: 'oo-design' }),
    Object.freeze({ directoryName: 'oo-choosing-a-pattern' }),
    Object.freeze({ directoryName: 'oo-other' })
  ])

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

  skills() {
    return this.#skills
  }
}

class CheckRun {
  static of({
    index = BASE_INDEX,
    catalogue = BASE_CATALOGUE,
    other = 'Adapter, Bridge and Retry appear here.',
    hasIndex = true
  } = {}) {
    const files = [
      [CATALOGUE_PATH, catalogue],
      [OTHER_PATH, other]
    ]
    if (hasIndex) files.push([INDEX_PATH, index])
    const report = new Report()
    new PatternIndexCheck(new FakeRepository(files)).inspect(report)
    return report
  }
}

test('PatternIndexCheck refuses a missing index', () => {
  assert.throws(() => CheckRun.of({ hasIndex: false }), {
    message: `pattern index: ${INDEX_PATH} is missing`
  })
})

test('PatternIndexCheck rejects a name a second time', () => {
  const index = BASE_INDEX.replace(
    '- **Retry.** Answers a failure.',
    '- **BRIDGE.** Answers two dimensions. [Other][other]\n' +
    '- **Retry.** Answers a failure.')
  const report = CheckRun.of({ index })
  assert.deepEqual(report.lines(), [
    `error ${INDEX_PATH}:5: pattern index: "BRIDGE" appears twice`,
    'failed: 1 error(s)'
  ])
})

test('PatternIndexCheck rejects a name out of alphabetical order', () => {
  const index = BASE_INDEX.replace(
    '- **Adapter.** Answers an outside interface. [Other][other]\n' +
    '- **Bridge.** Answers two dimensions. [Other][other]',
    '- **Bridge.** Answers two dimensions. [Other][other]\n' +
    '- **Adapter.** Answers an outside interface. [Other][other]')
  const report = CheckRun.of({ index })
  assert.deepEqual(report.lines(), [
    `error ${INDEX_PATH}:4: pattern index: ` +
    '"Adapter" is out of alphabetical order',
    'failed: 1 error(s)'
  ])
})

test('PatternIndexCheck rejects an item that links no skill', () => {
  const index = BASE_INDEX.replace(
    '- **Adapter.** Answers an outside interface. [Other][other]',
    '- **Adapter.** Answers an outside interface. [Other][gone]')
  const report = CheckRun.of({ index })
  assert.deepEqual(report.lines(), [
    `error ${INDEX_PATH}:3: pattern index: "Adapter" links no skill`,
    'failed: 1 error(s)'
  ])
})

test('PatternIndexCheck rejects a name named nowhere in the pack', () => {
  const index = BASE_INDEX.replace(
    '- **Retry.** Answers a failure.',
    '- **Mediator.** Answers coordination. [Other][other]\n' +
    '- **Retry.** Answers a failure.')
  const report = CheckRun.of({ index })
  assert.deepEqual(report.lines(), [
    `error ${INDEX_PATH}:5: pattern index: ` +
    '"Mediator" is named nowhere in the pack',
    'failed: 1 error(s)'
  ])
})

test('PatternIndexCheck rejects a catalogue item with no entry', () => {
  const catalogue = BASE_CATALOGUE.replace(
    '- **Retry.** A failure that may pass.',
    '- **Retry Policy.** A failure that may pass.')
  const report = CheckRun.of({ catalogue })
  assert.deepEqual(report.lines(), [
    `error ${CATALOGUE_PATH}:5: pattern index: ` +
    '"Retry Policy" from the catalogue has no entry',
    'failed: 1 error(s)'
  ])
})

test('PatternIndexCheck passes the aligned index and catalogue', () => {
  const report = CheckRun.of()
  assert.deepEqual(report.lines(), ['ok 3 pattern(s)'])
})

test('PatternIndexCheck accepts a name through its plural', () => {
  const catalogue = [
    '# Patterns by problem',
    '',
    '- **Adapter.** An outside interface.',
    '- **Bridge.** Two dimensions.',
    ''
  ].join('\n')
  const report = CheckRun.of({
    catalogue,
    other: 'Adapter and Bridge back off after several retries.'
  })
  assert.deepEqual(report.lines(), ['ok 3 pattern(s)'])
})

test('PatternIndexCheck accepts a hyphen for a space', () => {
  const index = BASE_INDEX.replace(
    '- **Retry.** Answers a failure.',
    '- **Model-view-controller.** Answers a screen. [Other][other]')
  const catalogue = [
    '# Patterns by problem',
    '',
    '- **Adapter.** An outside interface.',
    '- **Bridge.** Two dimensions.',
    ''
  ].join('\n')
  const report = CheckRun.of({
    index,
    catalogue,
    other: 'Adapter, Bridge and the Model view controller split.'
  })
  assert.deepEqual(report.lines(), ['ok 3 pattern(s)'])
})
