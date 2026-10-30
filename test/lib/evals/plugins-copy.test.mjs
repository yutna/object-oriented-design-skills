import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { PluginsCopy } from '../../../scripts/lib/evals/plugins-copy.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class PluginsFixture {
  static PLUGINS = Object.freeze([
    {
      directory: 'core',
      name: 'object-oriented-design-skills',
      skills: ['oo-assigning-responsibilities', 'oo-design']
    },
    {
      directory: 'java',
      name: 'object-oriented-design-java',
      skills: ['oo-java']
    }
  ])

  static LISTING = Object.freeze([
    'object-oriented-design-skills:oo-assigning-responsibilities',
    'object-oriented-design-skills:oo-design',
    'object-oriented-design-java:oo-java'
  ])

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-plugins-copy-'))
    for (const plugin of PluginsFixture.PLUGINS) {
      await PluginsFixture.#writePlugin(root, plugin)
    }
    return root
  }

  static async #writePlugin(root, plugin) {
    const directory = join(root, 'plugins', plugin.directory)
    await mkdir(join(directory, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(directory, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify({
        name: plugin.name,
        version: '0.5.0'
      })}\n`)
    for (const skill of plugin.skills) {
      await PluginsFixture.#writeSkill(directory, skill)
    }
  }

  static async #writeSkill(plugin, skill) {
    const directory = join(plugin, 'skills', skill)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      `name: ${skill}`,
      'description: Use when a clinic design needs work.',
      'license: MIT',
      'metadata:',
      '  version: 0.5.0',
      '  pack: object-oriented-design-skills',
      '---',
      '',
      `# ${skill}`,
      ''
    ].join('\n'))
  }

  static close(root) {
    return rm(root, { recursive: true, force: true })
  }
}

test('PluginsCopy copies every plugin of the repository', async () => {
  const root = await PluginsFixture.create()
  try {
    const copy = PluginsCopy.of(Repository.at(root))
    try {
      assert.notEqual(copy.path, join(root, 'plugins'))
      for (const plugin of PluginsFixture.PLUGINS) {
        assert.equal(
          existsSync(join(
            copy.path,
            plugin.directory,
            '.claude-plugin',
            'plugin.json')),
          true)
      }
    } finally {
      copy.close()
    }
  } finally {
    await PluginsFixture.close(root)
  }
})

test('PluginsCopy names each skill with its own plugin', async () => {
  const root = await PluginsFixture.create()
  try {
    const copy = PluginsCopy.of(Repository.at(root))
    try {
      assert.deepEqual(copy.listing(), PluginsFixture.LISTING)
    } finally {
      copy.close()
    }
  } finally {
    await PluginsFixture.close(root)
  }
})

test('PluginsCopy close removes only the copy', async () => {
  const root = await PluginsFixture.create()
  try {
    const copy = PluginsCopy.of(Repository.at(root))
    const temporary = dirname(copy.path)
    assert.notEqual(copy.path, join(root, 'plugins'))
    copy.close()
    assert.equal(existsSync(temporary), false)
    for (const plugin of PluginsFixture.PLUGINS) {
      assert.equal(
        existsSync(join(root, 'plugins', plugin.directory)),
        true)
    }
  } finally {
    await PluginsFixture.close(root)
  }
})
