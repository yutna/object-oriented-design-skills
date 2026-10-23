import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Plugin } from '../plugin.mjs'

export class PluginCopy {
  static #SOURCE = 'plugins/core'

  #root
  #path

  static of(repository) {
    // The model must see a pristine copy, so every run gets its own folder.
    const root = mkdtempSync(join(tmpdir(), 'oo-plugin-copy-'))
    const path = join(root, 'plugin')
    try {
      cpSync(join(repository.root, PluginCopy.#SOURCE), path, {
        recursive: true
      })
      return new PluginCopy(root, path)
    } catch (error) {
      rmSync(root, { recursive: true, force: true })
      throw error
    }
  }

  constructor(root, path) {
    this.#root = root
    this.#path = path
    Object.freeze(this)
  }

  get path() {
    return this.#path
  }

  skills() {
    // Reading the copy proves the listing belongs to the files the model saw.
    return new Plugin(this.#path).skills()
      .map((skill) => skill.name)
  }

  close() {
    // The copy holds no result, so it goes as soon as the run ends.
    rmSync(this.#root, { recursive: true, force: true })
  }
}
