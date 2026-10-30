import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { DomainCheck } from '../../../scripts/lib/checks/domain-check.mjs'
import { MarkdownDocument } from '../../../scripts/lib/markdown-document.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'plugins/core/skills/oo-assigning-responsibilities/SKILL.md'
const JAVA_PATH = 'plugins/java/skills/oo-java/SKILL.md'

class FakeSkill {
  #path
  #document

  constructor(path, text) {
    this.#path = path
    this.#document = new MarkdownDocument(new TextFile(path, text))
  }

  get path() {
    return this.#path
  }

  get document() {
    return this.#document
  }

  referenceFiles() {
    return []
  }
}

class FakeRepository {
  #skills

  constructor(skills) {
    this.#skills = Object.freeze([...skills])
  }

  skills() {
    return this.#skills
  }
}

class CheckRun {
  static of(text) {
    const report = new Report()
    new DomainCheck(new FakeRepository([
      new FakeSkill(PATH, text)
    ])).inspect(report)
    return report
  }
}

test('DomainCheck rejects a stock word in a text fence', () => {
  const report = CheckRun.of([
    '# Skill',
    '',
    '```text',
    'class Customer',
    '  - id',
    '```',
    ''
  ].join('\n'))
  assert.deepEqual(report.lines(), [
    `error ${PATH}: stock example word: customer`,
    'failed: 1 error(s)'
  ])
})

test('DomainCheck passes a clinic text fence', () => {
  const report = CheckRun.of([
    '# Skill',
    '',
    '```text',
    'class Slot',
    '  - patient: PatientId',
    '```',
    ''
  ].join('\n'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-domain-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture-market',
        plugins: [
          {
            name: 'object-oriented-design-skills',
            version: '1.0.0',
            source: './plugins/core'
          },
          {
            name: 'object-oriented-design-java',
            version: '1.0.0',
            source: './plugins/java'
          }
        ]
      }))
    for (const [directory, name] of [
      ['core', 'object-oriented-design-skills'],
      ['java', 'object-oriented-design-java']
    ]) {
      await mkdir(join(root, 'plugins', directory, '.claude-plugin'), {
        recursive: true
      })
      await writeFile(
        join(
          root,
          'plugins',
          directory,
          '.claude-plugin',
          'plugin.json'),
        JSON.stringify({ name, version: '1.0.0' }))
    }
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeJavaSkill(body) {
    const directory = join(
      this.#root,
      'plugins',
      'java',
      'skills',
      'oo-java')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      'name: oo-java',
      'description: Use when testing.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills',
      '---',
      '',
      body
    ].join('\n'))
  }

  javaSkillPath() {
    return join(this.#root, JAVA_PATH)
  }

  inspect() {
    const report = new Report()
    new DomainCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('DomainCheck rejects a stock word in a java fence', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeJavaSkill([
      '# Skill',
      '',
      '```java',
      'class Customer {',
      '  private PatientId owner;',
      '}',
      '```',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.javaSkillPath()}: ` +
      'stock example word: customer',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('DomainCheck passes a clinic java fence', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeJavaSkill([
      '# Skill',
      '',
      '```java',
      'class Slot {',
      '  private PatientId patient;',
      '}',
      '```',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
  } finally {
    await repository.close()
  }
})
