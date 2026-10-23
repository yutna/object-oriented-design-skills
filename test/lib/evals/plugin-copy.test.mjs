import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { PluginCopy } from '../../../scripts/lib/evals/plugin-copy.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class EvalTestRun {
  static #FILES = Object.freeze([
    'test/lib/evals/eval-build.test.mjs',
    'test/lib/evals/plugin-eval-run.test.mjs',
    'test/lib/evals/model-routing.test.mjs',
    'test/lib/checks/eval-plugin-check.test.mjs'
  ])
  static #ROUNDS = 2
  static #PREFIX = 'oo-plugin-copy-'

  static twice(temporary) {
    // Each round gets a private temporary folder, so a concurrent test file
    // cannot add a folder this run did not make.
    for (let round = 0; round < EvalTestRun.#ROUNDS; round += 1) {
      const environment = {
        ...process.env,
        TMPDIR: temporary,
        TMP: temporary,
        TEMP: temporary
      }
      delete environment.NODE_TEST_CONTEXT
      const child = spawnSync(
        process.execPath,
        ['--test', ...EvalTestRun.#FILES],
        { cwd: process.cwd(), env: environment, encoding: 'utf8' })
      assert.equal(
        child.status, 0,
        `round ${round + 1} failed\n${child.stdout}${child.stderr}`)
    }
  }

  static copies(temporary) {
    return readdirSync(temporary)
      .filter((name) => name.startsWith(EvalTestRun.#PREFIX))
  }
}

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

test('two runs of the eval tests leave no plugin copy behind', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'oo-eval-tests-'))
  try {
    EvalTestRun.twice(temporary)
    assert.deepEqual(
      EvalTestRun.copies(temporary), [],
      'the eval tests left plugin copies behind')
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
