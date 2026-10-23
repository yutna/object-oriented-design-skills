import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { TaskCaseCount } from '../../../scripts/lib/counts/task-case-count.mjs'

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
    const root = await mkdtemp(join(tmpdir(), 'oo-task-count-'))
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

  async write(fileName) {
    await writeFile(join(this.#directory, fileName), [
      'schema_version: "1.1"',
      `name: ${fileName.replace(/\.yaml$/, '')}`,
      'tags: [task, smoke]',
      'context:',
      '  scaffold_script: fixture.sh',
      'execution:',
      '  allowed_tools: [Skill]',
      'graders: []',
      ''
    ].join('\n'))
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('TaskCaseCount counts the yaml files under evals/tasks', async () => {
  const directory = await TaskDirectory.create()
  try {
    await directory.write('a01-one.yaml')
    await directory.write('b02-two.yaml')
    await directory.write('c03-three.yaml')
    assert.equal(
      new TaskCaseCount().value(directory.repository), 3)
    assert.equal(
      new TaskCaseCount().equals(new TaskCaseCount()), true)
  } finally {
    await directory.close()
  }
})
