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

  static LANGUAGES = Object.freeze([
    {
      directory: 'java',
      plugin: 'object-oriented-design-java',
      skill: 'oo-java',
      task: 't02-java-cancellation-kinds'
    },
    {
      directory: 'python',
      plugin: 'object-oriented-design-python',
      skill: 'oo-python',
      task: 't07-python-second-sender'
    },
    {
      directory: 'javascript',
      plugin: 'object-oriented-design-javascript',
      skill: 'oo-javascript',
      task: 't05-javascript-second-store'
    }
  ])

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-plugin-copy-'))
    await PluginFixture.#writePlugin(
      root, 'core', 'object-oriented-design-skills', PluginFixture.SKILLS)
    for (const language of PluginFixture.LANGUAGES) {
      await PluginFixture.#writePlugin(
        root,
        language.directory,
        language.plugin,
        [language.skill])
      await PluginFixture.#writeTaskCase(root, language)
    }
    return root
  }

  static async #writePlugin(root, directory, name, skills) {
    const plugin = join(root, 'plugins', directory)
    await mkdir(join(plugin, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(plugin, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify({ name, version: '0.5.0' })}\n`)
    for (const skill of skills) {
      await PluginFixture.#writeSkill(plugin, skill)
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

  static async #writeTaskCase(root, language) {
    const directory = join(root, 'evals', 'tasks')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, `${language.task}.yaml`), [
      'schema_version: "1.1"',
      `name: ${language.task}`,
      'tags: [task]',
      'graders:',
      '  - name: loaded-skill',
      '    type: tool_used',
      '    tool: Skill',
      `    input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?` +
        `${language.skill}"'`,
      ''
    ].join('\n'))
  }

  static close(root) {
    return rm(root, { recursive: true, force: true })
  }
}

class CopyCase {
  static task(name) {
    return { name, family: 'task', tags: ['task'] }
  }

  static question(name) {
    return { name, family: 'question', tags: ['question'] }
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

test('a java task case copies oo-java and no other language skill',
  async () => {
    const root = await PluginFixture.create()
    const java = PluginFixture.LANGUAGES[0]
    try {
      const copy = PluginCopy.of(Repository.at(root), [
        CopyCase.task(java.task)
      ])
      try {
        assert.deepEqual(copy.skills(), [
          'oo-assigning-responsibilities',
          'oo-design',
          'oo-java'
        ])
        for (const other of PluginFixture.LANGUAGES.slice(1)) {
          assert.equal(
            existsSync(join(copy.path, 'skills', other.skill)), false)
        }
      } finally {
        copy.close()
      }
    } finally {
      await PluginFixture.close(root)
    }
  })

test('task cases in two languages copy both language skills', async () => {
  const root = await PluginFixture.create()
  const [java, python] = PluginFixture.LANGUAGES
  try {
    const copy = PluginCopy.of(Repository.at(root), [
      CopyCase.task(java.task),
      CopyCase.task(python.task)
    ])
    try {
      assert.deepEqual(copy.skills(), [
        'oo-assigning-responsibilities',
        'oo-design',
        'oo-java',
        'oo-python'
      ])
    } finally {
      copy.close()
    }
  } finally {
    await PluginFixture.close(root)
  }
})

test('a question case copies the core skills only', async () => {
  const root = await PluginFixture.create()
  try {
    const copy = PluginCopy.of(Repository.at(root), [
      CopyCase.question('q01-the-slot-rule-keeps-moving')
    ])
    try {
      assert.deepEqual(copy.skills(), PluginFixture.SKILLS)
    } finally {
      copy.close()
    }
  } finally {
    await PluginFixture.close(root)
  }
})

test('a case naming oo-javascript does not copy oo-java', async () => {
  const root = await PluginFixture.create()
  const javascript = PluginFixture.LANGUAGES[2]
  try {
    const copy = PluginCopy.of(Repository.at(root), [
      CopyCase.task(javascript.task)
    ])
    try {
      assert.deepEqual(copy.skills(), [
        'oo-assigning-responsibilities',
        'oo-design',
        'oo-javascript'
      ])
      assert.equal(
        existsSync(join(copy.path, 'skills', 'oo-java')), false)
    } finally {
      copy.close()
    }
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
