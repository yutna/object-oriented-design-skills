import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ManifestCheck } from '../../../scripts/lib/checks/manifest-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create({
    packageVersion = '1.0.0',
    entryVersion = '1.0.0',
    pluginVersion = '1.0.0'
  } = {}) {
    const root = await mkdtemp(join(tmpdir(), 'oo-manifest-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: packageVersion }))
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture-market',
        plugins: [
          {
            name: 'fixture-plugin',
            version: entryVersion,
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
        version: pluginVersion
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writePluginPackageJson() {
    await writeFile(
      join(this.#root, 'plugins', 'core', 'package.json'),
      '{}')
  }

  marketplacePath() {
    return join(this.#root, '.claude-plugin', 'marketplace.json')
  }

  pluginPath() {
    return join(
      this.#root,
      'plugins',
      'core',
      '.claude-plugin',
      'plugin.json')
  }

  inspect() {
    const report = new Report()
    new ManifestCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('a valid marketplace and plugin pass the manifest check', async () => {
  const repository = await TempRepository.create()
  try {
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 2 manifest(s)'])
  } finally {
    await repository.close()
  }
})

test('a marketplace entry version must equal the package version', async () => {
  const repository = await TempRepository.create({ entryVersion: '0.9.0' })
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.marketplacePath()}: ` +
      'marketplace entry fixture-plugin version 0.9.0 does not match ' +
      'package version 1.0.0'))
  } finally {
    await repository.close()
  }
})

test('a plugin version must equal the package version', async () => {
  const repository = await TempRepository.create({ pluginVersion: '0.9.0' })
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.pluginPath()}: ` +
      'plugin fixture-plugin version 0.9.0 does not match package ' +
      'version 1.0.0'))
  } finally {
    await repository.close()
  }
})

test('a package.json under plugins is rejected', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writePluginPackageJson()
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${join('plugins', 'core', 'package.json')}: ` +
      'package.json is not allowed under plugins'))
  } finally {
    await repository.close()
  }
})
