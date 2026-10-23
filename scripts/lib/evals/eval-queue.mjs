import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { RepoError } from '../errors.mjs'

export class EvalQueue {
  static #FILE = 'evals/results/queue.json'

  #path

  constructor(repository) {
    this.#path = join(repository.root, EvalQueue.#FILE)
    Object.freeze(this)
  }

  get path() {
    return this.#path
  }

  entries() {
    // The oldest entry is always first, so the queue is a plain backlog.
    return Object.freeze(this.#load().map((entry) =>
      this.#frozen(entry)))
  }

  peek() {
    return this.entries()[0] ?? null
  }

  add(entry) {
    const validated = EvalQueue.#validated(entry)
    this.#save([...this.#load(), validated])
    return this.#frozen(validated)
  }

  drop() {
    const [first, ...rest] = this.#load()
    // An empty queue drops nothing and stays empty.
    if (first === undefined) return null
    this.#save(rest)
    return this.#frozen(first)
  }

  #load() {
    if (!existsSync(this.#path)) return []
    try {
      const parsed = JSON.parse(readFileSync(this.#path, 'utf8'))
      if (!Array.isArray(parsed)) {
        throw new Error('queue must be a JSON array')
      }
      return parsed.map((entry) => EvalQueue.#validated(entry))
    } catch (error) {
      throw new RepoError(
        `eval queue unreadable: ${this.#path}: ${error.message}`)
    }
  }

  #save(entries) {
    mkdirSync(dirname(this.#path), { recursive: true })
    writeFileSync(this.#path, `${JSON.stringify(entries, null, 2)}\n`)
  }

  #frozen(entry) {
    if (typeof entry.pause === 'string') {
      return Object.freeze({ pause: entry.pause })
    }
    return Object.freeze({
      id: entry.id,
      label: entry.label,
      script: entry.script,
      args: Object.freeze([...entry.args])
    })
  }

  static #validated(entry) {
    if (entry !== null && typeof entry === 'object' &&
      typeof entry.pause === 'string') {
      return { pause: entry.pause }
    }
    if (entry !== null && typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.label === 'string' &&
      typeof entry.script === 'string' &&
      Array.isArray(entry.args) &&
      entry.args.every((argument) => typeof argument === 'string')) {
      return {
        id: entry.id,
        label: entry.label,
        script: entry.script,
        args: entry.args
      }
    }
    throw new Error('entry is neither a piece nor a pause')
  }
}
