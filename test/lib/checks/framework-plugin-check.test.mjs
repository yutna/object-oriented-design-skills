import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  FrameworkPluginCheck
} from '../../../scripts/lib/checks/framework-plugin-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create(plugins) {
    const root = await mkdtemp(join(tmpdir(), 'oo-framework-'))
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
      skills: [
        {
          name: 'oo-design',
          body: ['## Overview', '', 'The index skill.', '']
        }
      ]
    }
  }

  static languagePlugin() {
    return {
      directory: 'java',
      name: 'object-oriented-design-java',
      skills: [
        {
          name: 'oo-java',
          body: ['## Overview', '', 'Plain Java rules.', '']
        }
      ]
    }
  }

  static frameworkPlugin({
    dependencies = [
      'object-oriented-design-skills',
      'object-oriented-design-java'
    ],
    overview = 'Load `oo-java` with this skill.'
  } = {}) {
    return {
      directory: 'java-spring',
      name: 'object-oriented-design-java-spring',
      dependencies,
      skills: [
        {
          name: 'oo-java-spring',
          body: ['## Overview', '', overview, '']
        }
      ]
    }
  }

  static webPlugin({
    dependencies = [],
    overview = 'Keep components small.'
  } = {}) {
    return {
      directory: 'web-components',
      name: 'object-oriented-design-web-components',
      dependencies,
      skills: [
        {
          name: 'oo-web-components',
          body: ['## Overview', '', overview, '']
        }
      ]
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
    for (const skill of plugin.skills) {
      const directory = join(
        root,
        'plugins',
        plugin.directory,
        'skills',
        skill.name)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'SKILL.md'), [
        '---',
        `name: ${skill.name}`,
        'description: Use when testing.',
        'license: MIT',
        'metadata:',
        '  version: 1.0.0',
        '  pack: object-oriented-design-skills',
        '---',
        '',
        `# ${skill.name}`,
        '',
        ...skill.body
      ].join('\n'))
    }
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

  skillPath(pluginDirectory, skill) {
    return join(
      this.#root,
      'plugins',
      pluginDirectory,
      'skills',
      skill,
      'SKILL.md')
  }

  inspect() {
    const report = new Report()
    new FrameworkPluginCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('a framework plugin with both dependencies and its base name passes', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin(),
    TempRepository.frameworkPlugin()
  ])
  try {
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 2 plugin(s)'])
  } finally {
    await repository.close()
  }
})

test('a framework plugin must list the core plugin as a dependency', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin(),
    TempRepository.frameworkPlugin({
      dependencies: ['object-oriented-design-java']
    })
  ])
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.pluginPath('java-spring')}: ` +
      'framework plugin object-oriented-design-java-spring must list ' +
      'dependency object-oriented-design-skills'))
  } finally {
    await repository.close()
  }
})

test('a framework plugin must list its family plugin as a dependency', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin(),
    TempRepository.frameworkPlugin({
      dependencies: ['object-oriented-design-skills']
    })
  ])
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.pluginPath('java-spring')}: ` +
      'framework plugin object-oriented-design-java-spring must list ' +
      'dependency object-oriented-design-java'))
  } finally {
    await repository.close()
  }
})

test('a framework skill Overview must name its base skill in backticks', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin(),
    TempRepository.frameworkPlugin({
      overview: 'Load the base language skill with this one.'
    })
  ])
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('java-spring', 'oo-java-spring')}: ` +
      'Overview must name `oo-java` in backticks'))
  } finally {
    await repository.close()
  }
})

test('a directory with no language plugin beside it is not a framework plugin', async () => {
  const repository = await TempRepository.create([
    TempRepository.corePlugin(),
    TempRepository.languagePlugin(),
    TempRepository.webPlugin()
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
    TempRepository.languagePlugin(),
    TempRepository.frameworkPlugin(),
    TempRepository.webPlugin()
  ])
  try {
    const report = repository.inspect()
    assert.deepEqual(report.lines(), ['ok 3 plugin(s)'])
  } finally {
    await repository.close()
  }
})
