import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { PluginCopy } from '../../../scripts/lib/evals/plugin-copy.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class PluginFixture {
  static SKILLS = Object.freeze([
    'oo-assigning-responsibilities',
    'oo-design'
  ])

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-plugin-copy-'))
    const plugin = join(root, 'plugins', 'core')
    await mkdir(join(plugin, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(plugin, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify({
        name: 'object-oriented-design-skills',
        version: '0.5.0'
      })}\n`)
    for (const skill of PluginFixture.SKILLS) {
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
    return root
  }

  static close(root) {
    return rm(root, { recursive: true, force: true })
  }
}

test('PluginCopy copies plugins/core and removes only the copy on close',
  async () => {
    const root = await PluginFixture.create()
    try {
      const copy = PluginCopy.of(Repository.at(root))
      const temporary = dirname(copy.path)
      assert.notEqual(copy.path, join(root, 'plugins', 'core'))
      assert.equal(
        existsSync(join(copy.path, '.claude-plugin', 'plugin.json')),
        true)
      assert.deepEqual(copy.skills(), PluginFixture.SKILLS)
      copy.close()
      assert.equal(existsSync(temporary), false)
      assert.equal(existsSync(join(root, 'plugins', 'core')), true)
    } finally {
      await PluginFixture.close(root)
    }
  })
