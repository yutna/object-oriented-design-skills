import { join, resolve } from 'node:path'

import { ManifestError } from './errors.mjs'
import { Plugin } from './plugin.mjs'
import { TextFile } from './text-file.mjs'

export class Marketplace {
  #root
  #manifest
  #path

  constructor(root) {
    this.#root = resolve(root)
    this.#path = join(
      this.#root,
      '.claude-plugin',
      'marketplace.json')
    let text
    try {
      text = TextFile.read(this.#path).text
    } catch {
      throw new ManifestError(
        this.#path,
        'Cannot read marketplace manifest')
    }
    try {
      this.#manifest = JSON.parse(text)
    } catch (error) {
      throw new ManifestError(
        this.#path,
        `Invalid marketplace manifest: ${error.message}`)
    }
  }

  get name() {
    return this.#manifest.name
  }

  entries() {
    return this.#manifest.plugins.map((entry) =>
      Object.freeze({
        name: entry.name,
        version: entry.version,
        source: entry.source
      }))
  }

  plugins() {
    return this.entries().map((entry) => {
      const directory = resolve(this.#root, entry.source)
      const plugin = new Plugin(directory)
      if (plugin.name !== entry.name) {
        throw new ManifestError(
          join(directory, '.claude-plugin', 'plugin.json'),
          `Plugin name ${plugin.name} does not match entry ${entry.name}`)
      }
      return plugin
    })
  }
}
