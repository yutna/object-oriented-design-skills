import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { EvalQueue } from '../../../scripts/lib/evals/eval-queue.mjs'
import { RepoError } from '../../../scripts/lib/errors.mjs'

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

class TempQueue {
  static async of() {
    const root = await mkdtemp(join(tmpdir(), 'oo-eval-queue-'))
    return new TempQueue(root)
  }

  #root
  #queue

  constructor(root) {
    this.#root = root
    this.#queue = new EvalQueue(new FakeRepository(root))
  }

  get root() {
    return this.#root
  }

  get queue() {
    return this.#queue
  }

  get path() {
    return join(this.#root, 'evals', 'results', 'queue.json')
  }

  async saved() {
    return JSON.parse(await readFile(this.path, 'utf8'))
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('EvalQueue starts empty when its file is missing', async () => {
  const fixture = await TempQueue.of()
  try {
    assert.deepEqual(fixture.queue.entries(), [])
    assert.equal(fixture.queue.peek(), null)
    assert.equal(fixture.queue.drop(), null)
  } finally {
    await fixture.close()
  }
})

test('EvalQueue keeps pieces and pauses in the order added', async () => {
  const fixture = await TempQueue.of()
  try {
    fixture.queue.add({
      id: 'p1',
      label: 'first piece',
      script: 'evals/piece.mjs',
      args: ['--arm']
    })
    fixture.queue.add({ pause: 'read the run log' })
    const entries = [
      {
        id: 'p1',
        label: 'first piece',
        script: 'evals/piece.mjs',
        args: ['--arm']
      },
      { pause: 'read the run log' }
    ]
    assert.deepEqual(fixture.queue.entries(), entries)
    assert.deepEqual(await fixture.saved(), entries)
    const reloaded = new EvalQueue(new FakeRepository(fixture.root))
    assert.deepEqual(reloaded.entries(), entries)
  } finally {
    await fixture.close()
  }
})

test('EvalQueue drops the oldest entry first', async () => {
  const fixture = await TempQueue.of()
  try {
    const piece = {
      id: 'p1',
      label: 'first piece',
      script: 'evals/piece.mjs',
      args: []
    }
    const pause = { pause: 'read the run log' }
    fixture.queue.add(piece)
    fixture.queue.add(pause)
    assert.deepEqual(fixture.queue.peek(), piece)
    assert.deepEqual(fixture.queue.drop(), piece)
    assert.deepEqual(fixture.queue.entries(), [pause])
    assert.deepEqual(await fixture.saved(), [pause])
  } finally {
    await fixture.close()
  }
})

test('EvalQueue reports unreadable JSON as a RepoError', async () => {
  const fixture = await TempQueue.of()
  try {
    await mkdir(dirname(fixture.path), { recursive: true })
    await writeFile(fixture.path, '{not json\n')
    assert.throws(
      () => fixture.queue.entries(),
      (error) => error instanceof RepoError &&
        /queue unreadable/.test(error.message))
  } finally {
    await fixture.close()
  }
})
