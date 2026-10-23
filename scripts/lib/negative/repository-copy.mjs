import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { RepoError } from '../errors.mjs'

export class RepositoryCopy {
  #root

  static of(root) {
    const source = resolve(root)
    const target = mkdtempSync(join(tmpdir(), 'oo-negative-'))
    try {
      for (const path of RepositoryCopy.#trackedFiles(source)) {
        const destination = join(target, path)
        mkdirSync(dirname(destination), { recursive: true })
        copyFileSync(join(source, path), destination)
      }
      RepositoryCopy.#linkModules(source, target)
      return new RepositoryCopy(target)
    } catch (error) {
      rmSync(target, { recursive: true, force: true })
      throw error
    }
  }

  static #trackedFiles(source) {
    const result = spawnSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      {
        cwd: source,
        encoding: 'utf8'
      })
    if (result.status !== 0) {
      throw new RepoError(
        `Cannot list repository files: ${result.stderr ?? result.error}`)
    }
    return result.stdout.split(/\r?\n/).filter((path) => path !== '')
  }

  static #linkModules(source, target) {
    const modules = join(source, 'node_modules')
    if (!existsSync(modules)) return
    symlinkSync(modules, join(target, 'node_modules'), 'junction')
  }

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get root() {
    return this.#root
  }

  dispose() {
    rmSync(this.#root, { recursive: true, force: true })
  }
}
