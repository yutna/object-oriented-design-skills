import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SelftestRunner } from '../../../scripts/lib/evals/selftest-runner.mjs'

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

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-selftest-runner-'))
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

class Stream {
  static events(output) {
    return output
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line))
  }
}

test('SelftestRunner lists one plugin under its own name', async () => {
  const root = await PluginsFixture.create()
  try {
    const directory = join(root, 'plugins', 'core')
    const runner = new SelftestRunner()
    const result = runner.run(
      'claude',
      ['--plugin-dir', directory],
      root)
    assert.equal(result.exitCode, 0)
    const [init, answer] = Stream.events(result.output)
    assert.deepEqual(init.skills, [
      'object-oriented-design-skills:oo-assigning-responsibilities',
      'object-oriented-design-skills:oo-design'
    ])
    assert.equal(answer.result, init.skills[0])
  } finally {
    await PluginsFixture.close(root)
  }
})

test('SelftestRunner lists every plugin of a plugins folder', async () => {
  const root = await PluginsFixture.create()
  try {
    const directory = join(root, 'plugins')
    const runner = new SelftestRunner()
    const result = runner.run(
      'claude',
      ['--plugin-dir', directory],
      root)
    assert.equal(result.exitCode, 0)
    const [init, answer] = Stream.events(result.output)
    assert.deepEqual([...init.skills].sort(), [
      'object-oriented-design-java:oo-java',
      'object-oriented-design-skills:oo-assigning-responsibilities',
      'object-oriented-design-skills:oo-design'
    ])
    assert.equal(answer.result, init.skills[0])
  } finally {
    await PluginsFixture.close(root)
  }
})
