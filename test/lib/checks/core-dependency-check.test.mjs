import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CoreDependencyCheck
} from '../../../scripts/lib/checks/core-dependency-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create(plugins) {
    const root = await mkdtemp(join(tmpdir(), 'oo-core-dependency-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture-market',
        plugins: plugins.map((plugin) => ({
          name: plugin.name,
          version: '1.0.0',
          source: `./plugins/${plugin.directory}`
        }))
      }))
    for (const plugin of plugins) {
      await this.#writePlugin(root, plugin)
    }
    return new TempRepository(root)
  }

  static corePlugin() {
    return {
      directory: 'core',
      name: 'object-oriented-design-skills',
      dependencies: []
    }
  }

  static languagePlugin({ dependencies } = {}) {
    return {
      directory: 'java',
      name: 'object-oriented-design-java',
      dependencies
    }
  }

  static frameworkPlugin({ dependencies } = {}) {
    return {
      directory: 'java-spring',
      name: 'object-oriented-design-java-spring',
      dependencies
    }
  }

  static webPlugin({ dependencies } = {}) {
    return {
      directory: 'web-components',
      name: 'object-oriented-design-web-components',
      dependencies
    }
  }

  static async #writePlugin(root, plugin) {
    const manifest = join(
      root,
      'plugins',
      plugin.directory,
      '.claude-plugin')
    await mkdir(manifest, { recursive: true })
    await writeFile(
      join(manifest, 'plugin.json'),
      JSON.stringify({
        name: plugin.name,
        version: '1.0.0',
        dependencies: plugin.dependencies
      }))
  }

  constructor(root) {
    this.#root = root
  }

  pluginPath(directory) {
    return join(
      this.#root,
      'plugins',
      directory,
      '.claude-plugin',
      'plugin.json')
  }

  inspect() {
    const report = new Report()
    new CoreDependencyCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('a language plugin without the core dependency fails', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin()
  ])
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.pluginPath('java')}: ` +
      'plugin object-oriented-design-java must list dependency ' +
      'object-oriented-design-skills'))
  } finally {
    await repository.close()
  }
})

test('a framework plugin without the core dependency fails', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin({
      dependencies: ['object-oriented-design-skills']
    }),
    TempRepository.frameworkPlugin({
      dependencies: ['object-oriented-design-java']
    })
  ])
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.pluginPath('java-spring')}: ` +
      'plugin object-oriented-design-java-spring must list dependency ' +
      'object-oriented-design-skills'))
  } finally {
    await repository.close()
  }
})

test('a repository where every non-core plugin lists the core ' +
  'passes', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin({
      dependencies: ['object-oriented-design-skills']
    }),
    TempRepository.frameworkPlugin({
      dependencies: [
        'object-oriented-design-skills',
        'object-oriented-design-java'
      ]
    })
  ])
  try {
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 2 plugin(s)'])
  } finally {
    await repository.close()
  }
})

test('the count is the non-core plugins the check read', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin({
      dependencies: ['object-oriented-design-skills']
    }),
    TempRepository.frameworkPlugin({
      dependencies: [
        'object-oriented-design-skills',
        'object-oriented-design-java'
      ]
    }),
    TempRepository.webPlugin({
      dependencies: ['object-oriented-design-skills']
    })
  ])
  try {
    const report = repository.inspect()
    assert.deepEqual(report.lines(), ['ok 3 plugin(s)'])
  } finally {
    await repository.close()
  }
})
