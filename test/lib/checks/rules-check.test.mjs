import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RulesCheck } from '../../../scripts/lib/checks/rules-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-rules-'))
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
    await mkdir(join(root, 'plugins', 'core', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'object-oriented-design-skills',
        version: '1.0.0'
      }))
    await mkdir(join(root, 'plugins', 'java', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'java', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'object-oriented-design-java',
        version: '1.0.0'
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(name, body, plugin = 'core') {
    const directory = join(
      this.#root,
      'plugins',
      plugin,
      'skills',
      name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      `name: ${name}`,
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

  skillPath(name, plugin = 'core') {
    return join(
      this.#root,
      'plugins',
      plugin,
      'skills',
      name,
      'SKILL.md')
  }

  inspect() {
    const report = new Report()
    new RulesCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class Rules {
  static body(items) {
    return [
      '# Core',
      '',
      '## Core rules',
      '',
      ...items,
      ''
    ].join('\n')
  }

  static item(number, label, statement, exception = null) {
    const lines = [`${number}. ${label}. **${statement}**`]
    if (exception !== null) {
      lines.push('', `   The exception is ${exception}`)
    }
    return lines.join('\n')
  }

  static list(spec) {
    const items = []
    let number = 1
    for (const [label, count] of spec) {
      for (let index = 0; index < count; index += 1) {
        items.push(Rules.item(
          number,
          label,
          `${label} number ${number}.`,
          label === 'Default' ? `case ${number}.` : null))
        number += 1
      }
    }
    return items
  }
}

test('a passing skill counts rules and reports the label mix', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-design',
      '# Index\n\n## Overview\n')
    await repository.writeSkill('oo-core', Rules.body([
      Rules.item(1, 'Rule', 'Give the behaviour\n   to the owner.'),
      Rules.item(2, 'Default', 'Use the fallback.', 'a stored rule wins.'),
      Rules.item(3, 'Judgement', 'Choose the smaller change.')
    ]))
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'labels: Rule 33% (1), Default 33% (1), Judgement 33% (1)',
      'ok 1 skill(s), 3 rule(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a missing label is an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-core',
      Rules.body(['1. **Do one thing.**']))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-core')}: ` +
      'item 1 must start with Rule., Default. or Judgement.',
      'labels: Rule 0% (0), Default 0% (0), Judgement 0% (0)',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('two labels are an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-core',
      Rules.body(['1. Rule. Default. **Do one thing.**']))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-core')}: ` +
      'item 1 carries more than one strictness label',
      'labels: Rule 100% (1), Default 0% (0), Judgement 0% (0)',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a Default without an exception is an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-core',
      Rules.body(['1. Default. **Do this usually.**']))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-core')}: ` +
      'Default item 1 needs a sentence starting "The exception"',
      'labels: Rule 0% (0), Default 100% (1), Judgement 0% (0)',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a skill with no numbered rules is an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-core', Rules.body([]))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-core')}: ` +
      'Core rules must hold at least one numbered item',
      'labels: Rule 0% (0), Default 0% (0), Judgement 0% (0)',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a rule must follow its label with a bold statement', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-core',
      Rules.body(['1. Rule. Do one thing.']))
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-core')}: ` +
      'item 1 must follow Rule., Default. or Judgement. ' +
      'with a bold statement',
      'labels: Rule 100% (1), Default 0% (0), Judgement 0% (0)',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a language skill rule without a label is an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-java',
      Rules.body(['1. **Do one thing.**']),
      'java')
    const report = repository.inspect()
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-java', 'java')}: ` +
      'item 1 must start with Rule., Default. or Judgement.',
      'labels: Rule 0% (0), Default 0% (0), Judgement 0% (0)',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('the note text for a known mix', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-core', Rules.body(Rules.list([
      ['Rule', 3],
      ['Default', 16],
      ['Judgement', 6]
    ])))
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'labels: Rule 12% (3), Default 64% (16), Judgement 24% (6)',
      'ok 1 skill(s), 25 rule(s)'
    ])
  } finally {
    await repository.close()
  }
})
