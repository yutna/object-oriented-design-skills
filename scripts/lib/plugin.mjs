import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { ManifestError } from './errors.mjs'
import { Skill } from './skill.mjs'
import { TextFile } from './text-file.mjs'

export class Plugin {
  #directory
  #manifest

  constructor(directory) {
    this.#directory = directory
    const path = join(directory, '.claude-plugin', 'plugin.json')
    let text
    try {
      text = TextFile.read(path).text
    } catch {
      throw new ManifestError(path, 'Cannot read plugin manifest')
    }
    try {
      this.#manifest = JSON.parse(text)
    } catch (error) {
      throw new ManifestError(
        path,
        `Invalid plugin manifest: ${error.message}`)
    }
  }

  get name() {
    return this.#manifest.name
  }

  get version() {
    return this.#manifest.version
  }

  get directory() {
    return this.#directory
  }

  skills() {
    const directory = join(this.#directory, 'skills')
    if (!existsSync(directory)) return []
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        directory: join(directory, entry.name)
      }))
      .filter((entry) =>
        existsSync(join(entry.directory, 'SKILL.md')))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => new Skill(
        entry.directory,
        TextFile.read(join(entry.directory, 'SKILL.md'))))
  }
}
