import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { QueueLockedError, RepoError } from '../errors.mjs'

export class QueueLock {
  static #FILE = 'oo-eval-queue.lock'

  #repository
  #runner
  #processes
  #clock
  #path = null
  #held = false

  constructor(repository, runner, processes, clock) {
    this.#repository = repository
    this.#runner = runner
    this.#processes = processes
    this.#clock = clock
  }

  acquire(report) {
    const path = this.#lockPath()
    const holder = QueueLock.#read(path)
    if (holder !== null) {
      // A holder that still runs wins; a dead holder's lock is taken over.
      if (this.#running(holder.pid)) throw new QueueLockedError(holder)
      report.note(
        `STALE: took the lock from ${holder.worktree} ` +
        `pid ${holder.pid} since ${holder.startedAt}`)
      rmSync(path, { force: true })
    }
    this.#claim(path)
    this.#path = path
    this.#held = true
  }

  release() {
    if (!this.#held) return
    // The lock names this run until the run returns, however it returns.
    rmSync(this.#path, { force: true })
    this.#held = false
  }

  #lockPath() {
    // Every worktree of one repository shares the git common directory.
    const { exitCode, output } = this.#runner.run(
      'git', ['rev-parse', '--git-common-dir'], this.#repository.root)
    if (exitCode !== 0) {
      throw new RepoError(
        `cannot read the git common directory: ${output.trim()}`, 2)
    }
    const directory = output.trim()
    if (directory === '') {
      throw new RepoError(
        'cannot read the git common directory: git printed nothing', 2)
    }
    return join(resolve(this.#repository.root, directory), QueueLock.#FILE)
  }

  #running(pid) {
    try {
      this.#processes.kill(pid, 0)
      return true
    } catch (error) {
      // A process owned by another user still holds the lock.
      return error.code !== 'ESRCH'
    }
  }

  #claim(path) {
    const holder = {
      worktree: this.#repository.root,
      pid: this.#processes.pid,
      startedAt: this.#clock.now().toISOString()
    }
    try {
      writeFileSync(path, `${JSON.stringify(holder)}\n`, { flag: 'wx' })
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new RepoError(
          `cannot write the eval queue lock: ${error.message}`, 2)
      }
      // Another run won the race between the read and the write.
      const current = QueueLock.#read(path)
      if (current === null) {
        throw new RepoError(
          `cannot write the eval queue lock: ${path} exists`, 2)
      }
      throw new QueueLockedError(current)
    }
  }

  static #read(path) {
    if (!existsSync(path)) return null
    try {
      const holder = JSON.parse(readFileSync(path, 'utf8'))
      if (holder === null || typeof holder !== 'object' ||
        typeof holder.worktree !== 'string' ||
        !Number.isInteger(holder.pid) ||
        typeof holder.startedAt !== 'string') {
        throw new Error('a lock must name a worktree, a pid and a start time')
      }
      return Object.freeze({
        worktree: holder.worktree,
        pid: holder.pid,
        startedAt: holder.startedAt
      })
    } catch (error) {
      throw new RepoError(
        `eval queue lock unreadable: ${path}: ${error.message}`)
    }
  }
}
