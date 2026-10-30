import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Plugin } from '../plugin.mjs'

export class PluginsCopy {
  static #SOURCE = 'plugins'
  static #MANIFEST = join('.claude-plugin', 'plugin.json')

  #root
  #path

  static of(repository) {
    // The model must see a pristine copy, so every run gets its own folder.
    const root = mkdtempSync(join(tmpdir(), 'oo-plugin-copy-'))
    const path = join(root, PluginsCopy.#SOURCE)
    try {
      cpSync(join(repository.root, PluginsCopy.#SOURCE), path, {
        recursive: true
      })
      return new PluginsCopy(root, path)
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

  listing() {
    // Reading the copy proves the listing belongs to the files the model saw.
    return this.#plugins().flatMap((plugin) =>
      plugin.skills().map((skill) =>
        `${plugin.name}:${skill.name}`))
  }

  close() {
    // The copy holds no result, so it goes as soon as the run ends.
    rmSync(this.#root, { recursive: true, force: true })
  }

  #plugins() {
    return readdirSync(this.#path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(this.#path, entry.name))
      .filter((directory) =>
        existsSync(join(directory, PluginsCopy.#MANIFEST)))
      .sort()
      .map((directory) => new Plugin(directory))
  }
}
