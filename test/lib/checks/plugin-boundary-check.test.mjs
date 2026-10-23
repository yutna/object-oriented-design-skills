import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  PluginBoundaryCheck
} from '../../../scripts/lib/checks/plugin-boundary-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-boundary-'))
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
            name: 'fixture-plugin',
            version: '1.0.0',
            source: './plugins/core'
          }
        ]
      }))
    await mkdir(join(root, 'plugins', 'core', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'fixture-plugin',
        version: '1.0.0'
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(name, body) {
    const directory = join(
      this.#root,
      'plugins',
      'core',
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

  async writeReference(skill, name, text) {
    const directory = join(
      this.#root,
      'plugins',
      'core',
      'skills',
      skill,
      'references')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, name), text)
  }

  skillPath(name) {
    return join(
      this.#root,
      'plugins',
      'core',
      'skills',
      name,
      'SKILL.md')
  }

  inspect() {
    const report = new Report()
    new PluginBoundaryCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('a skill links inside its plugin and names an existing skill', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-one', [
      '# One',
      'See [oo-two](../oo-two/SKILL.md) and `oo-two`.',
      '[Self](#one)',
      ''
    ].join('\n'))
    await repository.writeReference('oo-one', 'note.md', [
      '# Note',
      '[Back](../SKILL.md) and `oo-two`.',
      ''
    ].join('\n'))
    await repository.writeSkill('oo-two', '# Two\n')
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'ok 3 boundary link(s), 3 skill name(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a relative link must stay inside the plugin', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-one', [
      '# One',
      '[Outside](../../../../AGENTS.md)',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-one')}: ` +
      'link ../../../../AGENTS.md resolves outside plugin fixture-plugin'))
  } finally {
    await repository.close()
  }
})

test('a link label must name an existing skill', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-one', [
      '# One',
      '[oo-missing](../oo-two/SKILL.md)',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-one')}: ` +
      'unknown skill name: oo-missing'))
  } finally {
    await repository.close()
  }
})

test('an inline code span must name an existing skill', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-one', [
      '# One',
      'Use `oo-missing` here.',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-one')}: ` +
      'unknown skill name: oo-missing'))
  } finally {
    await repository.close()
  }
})
