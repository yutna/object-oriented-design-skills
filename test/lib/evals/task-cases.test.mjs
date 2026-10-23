import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { TaskCases } from '../../../scripts/lib/evals/task-cases.mjs'

class FakeRepository {
  #root

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get root() {
    return this.#root
  }
}

class TaskDirectory {
  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-task-cases-'))
    const directory = join(root, 'evals', 'tasks')
    await mkdir(directory, { recursive: true })
    return new TaskDirectory(root, directory)
  }

  #root
  #directory

  constructor(root, directory) {
    this.#root = root
    this.#directory = directory
    Object.freeze(this)
  }

  get repository() {
    return new FakeRepository(this.#root)
  }

  async write(fileName, text) {
    await writeFile(join(this.#directory, fileName), text)
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class CaseYaml {
  static of(name) {
    return [
      'schema_version: "1.1"',
      `name: ${name}`,
      'description: A clinic task.',
      'tags: [task, smoke]',
      'context:',
      '  scaffold_script: fixture.sh',
      'execution:',
      '  prompt: A clinic task.',
      '  allowed_tools: [Read, Skill]',
      'graders:',
      '  - name: loaded-any-skill',
      '    type: tool_used',
      '    tool: Skill',
      ''
    ].join('\n')
  }
}

test('TaskCases reads every task case in name order', async () => {
  const directory = await TaskDirectory.create()
  try {
    await directory.write('b02-second.yaml', CaseYaml.of('b02-second'))
    await directory.write('a01-first.yaml', CaseYaml.of('a01-first'))
    const cases = TaskCases.of(directory.repository)
    assert.equal(Object.isFrozen(cases), true)
    assert.deepEqual(
      cases.map(({ fileName, name }) => [fileName, name]),
      [
        ['a01-first.yaml', 'a01-first'],
        ['b02-second.yaml', 'b02-second']
      ])
  } finally {
    await directory.close()
  }
})

test('TaskCases reports invalid YAML as a RepoError naming the file',
  async () => {
    const directory = await TaskDirectory.create()
    try {
      await directory.write('b01-broken.yaml', 'name: [\n')
      assert.throws(
        () => TaskCases.of(directory.repository),
        (error) => error instanceof RepoError &&
          error.message.includes('b01-broken.yaml'))
    } finally {
      await directory.close()
    }
  })
