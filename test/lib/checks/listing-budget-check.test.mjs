import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ListingBudgetCheck } from '../../../scripts/lib/checks/listing-budget-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-listing-'))
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
      JSON.stringify({ name: 'fixture-plugin', version: '1.0.0' }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(directoryName, name, description) {
    const directory = join(
      this.#root,
      'plugins',
      'core',
      'skills',
      directoryName)
    await mkdir(directory, { recursive: true })
    await writeFile(
      join(directory, 'SKILL.md'),
      [
        '---',
        `name: ${name}`,
        `description: ${description}`,
        '---',
        '# Demo',
        ''
      ].join('\n'))
  }

  pluginDirectory() {
    return join(this.#root, 'plugins', 'core')
  }

  inspect(ceilings) {
    const report = new Report()
    new ListingBudgetCheck(
      Repository.at(this.#root),
      ceilings).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('ListingBudgetCheck.CEILINGS is frozen and gives the pack 8000', () => {
  assert.equal(Object.isFrozen(ListingBudgetCheck.CEILINGS), true)
  assert.equal(
    ListingBudgetCheck.CEILINGS['object-oriented-design-skills'],
    8000)
})

test('ListingBudgetCheck.CEILINGS rejects mutation', () => {
  assert.throws(() => {
    ListingBudgetCheck.CEILINGS['object-oriented-design-skills'] = 9000
  }, TypeError)
  assert.equal(
    ListingBudgetCheck.CEILINGS['object-oriented-design-skills'],
    8000)
})

test('a listing at its ceiling passes the listing budget check', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', 'oo-demo', 'Use when testing.')
    await repository.writeSkill(
      'oo-other',
      'oo-other',
      'Use when testing.')
    const report = repository.inspect({ 'fixture-plugin': 49 })
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 1 listing(s)'])
  } finally {
    await repository.close()
  }
})

test('a listing over its ceiling is rejected', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', 'oo-demo', 'Use when testing.')
    await repository.writeSkill(
      'oo-other',
      'oo-other',
      'Use when testing.')
    const report = repository.inspect({ 'fixture-plugin': 48 })
    assert.ok(report.lines().includes(
      `error ${repository.pluginDirectory()}: ` +
      'plugin fixture-plugin listing is 49 characters, over its ' +
      '48-character ceiling'))
  } finally {
    await repository.close()
  }
})
