import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { QueueLockedError, RepoError } from '../../../scripts/lib/errors.mjs'
import { QueueLock } from '../../../scripts/lib/evals/queue-lock.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

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

class FakeRunner {
  #directory

  constructor(directory) {
    this.#directory = directory
  }

  run(command, args) {
    if (command === 'git' && args[0] === 'rev-parse' &&
      args[1] === '--git-common-dir') {
      return { exitCode: 0, output: `${this.#directory}\n` }
    }
    return { exitCode: 1, output: 'unexpected command\n' }
  }
}

class FakeProcesses {
  #pid
  #alive

  constructor(pid, alive) {
    this.#pid = pid
    this.#alive = new Set(alive)
  }

  get pid() {
    return this.#pid
  }

  kill(pid) {
    if (this.#alive.has(pid)) return true
    const error = new Error(`kill ESRCH ${pid}`)
    error.code = 'ESRCH'
    throw error
  }
}

class FakeClock {
  #startedAt

  constructor(startedAt) {
    this.#startedAt = startedAt
  }

  now() {
    return new Date(this.#startedAt)
  }
}

class TempLock {
  static async of() {
    const root = await mkdtemp(join(tmpdir(), 'oo-queue-lock-'))
    return new TempLock(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  get path() {
    return join(this.#root, 'oo-eval-queue.lock')
  }

  lock({
    pid = 4242,
    alive = [4242],
    directory = this.#root,
    startedAt = Date.UTC(2026, 9, 23, 9, 0, 0)
  } = {}) {
    return new QueueLock(
      new FakeRepository(this.#root),
      new FakeRunner(directory),
      new FakeProcesses(pid, alive),
      new FakeClock(startedAt))
  }

  async holder() {
    return JSON.parse(await readFile(this.path, 'utf8'))
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('QueueLock records the worktree, process and start time', async () => {
  const fixture = await TempLock.of()
  try {
    fixture.lock({ pid: 4242 }).acquire(new Report())
    assert.deepEqual(await fixture.holder(), {
      worktree: fixture.root,
      pid: 4242,
      startedAt: '2026-10-23T09:00:00.000Z'
    })
  } finally {
    await fixture.close()
  }
})

test('a second --run is refused while a live holder has the lock',
  async () => {
    const fixture = await TempLock.of()
    try {
      fixture.lock({ pid: 7777, alive: [7777] }).acquire(new Report())
      const second = fixture.lock({ pid: 4242, alive: [7777, 4242] })
      assert.throws(
        () => second.acquire(new Report()),
        (error) => error instanceof QueueLockedError &&
          error instanceof RepoError &&
          error.message.includes(fixture.root) &&
          error.message.includes('pid 7777') &&
          error.message.includes('2026-10-23T09:00:00.000Z'))
      assert.equal((await fixture.holder()).pid, 7777)
    } finally {
      await fixture.close()
    }
  })

test("a dead holder's lock is taken over with a note naming it", async () => {
  const fixture = await TempLock.of()
  try {
    fixture.lock({ pid: 7777, alive: [7777] }).acquire(new Report())
    const report = new Report()
    fixture.lock({ pid: 4242, alive: [4242] }).acquire(report)
    assert.deepEqual(
      report.lines().filter((line) => line.startsWith('STALE: ')),
      [`STALE: took the lock from ${fixture.root} pid 7777 ` +
        'since 2026-10-23T09:00:00.000Z'])
    assert.deepEqual(await fixture.holder(), {
      worktree: fixture.root,
      pid: 4242,
      startedAt: '2026-10-23T09:00:00.000Z'
    })
  } finally {
    await fixture.close()
  }
})

test('QueueLock release removes the lock it holds', async () => {
  const fixture = await TempLock.of()
  try {
    const lock = fixture.lock()
    lock.acquire(new Report())
    assert.equal(existsSync(fixture.path), true)
    lock.release()
    assert.equal(existsSync(fixture.path), false)
    lock.release()
  } finally {
    await fixture.close()
  }
})

test('QueueLock keeps the lock in the git common directory', async () => {
  const fixture = await TempLock.of()
  try {
    await mkdir(join(fixture.root, '.git'))
    const lock = fixture.lock({ directory: '.git' })
    lock.acquire(new Report())
    assert.equal(
      existsSync(join(fixture.root, '.git', 'oo-eval-queue.lock')), true)
  } finally {
    await fixture.close()
  }
})

test('QueueLock refuses a lock it cannot read', async () => {
  const fixture = await TempLock.of()
  try {
    await writeFile(fixture.path, '{not json\n')
    assert.throws(
      () => fixture.lock().acquire(new Report()),
      (error) => error instanceof RepoError &&
        /lock unreadable/.test(error.message))
  } finally {
    await fixture.close()
  }
})
