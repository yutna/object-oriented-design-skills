import test from 'node:test'
import assert from 'node:assert/strict'

import { PatternMentionCheck } from '../../../scripts/lib/checks/pattern-mention-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const INDEX_PATH =
  'plugins/core/skills/oo-design/references/pattern-index.md'
const SKILL_PATH = 'plugins/core/skills/oo-other/SKILL.md'

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
  static of({ index = BASE_INDEX, skill, hasIndex = true } = {}) {
    const files = [[SKILL_PATH, skill]]
    if (hasIndex) files.push([INDEX_PATH, index])
    const report = new Report()
    new PatternMentionCheck(new FakeRepository(files)).inspect(report)
    return report
  }
}

test('PatternMentionCheck reports a used name with no index item', () => {
  const report = CheckRun.of({
    skill: 'The clinic publishes through a Message Bus.'
  })
  assert.deepEqual(report.lines(), [
    `error ${SKILL_PATH}:1: pattern index: "Message Bus" is named in the ` +
    'pack but has no entry',
    'failed: 1 error(s)'
  ])
})
