import { existsSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { ManifestError } from './errors.mjs'
import { Marketplace } from './marketplace.mjs'
import { TextFile } from './text-file.mjs'

export class Repository {
  static #SKIPPED_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    '.claude'
  ])

  static #SKIPPED_FILES = new Set([
    'OOP_SOURCES.md',
    'PRIVATE-NOTES.md'
  ])

  #root

  static at(rootPath) {
    return new Repository(rootPath)
  }

  constructor(rootPath) {
    this.#root = resolve(rootPath)
  }

  get root() {
    return this.#root
  }

  get packageVersion() {
    const path = join(this.#root, 'package.json')
    let text
    try {
      text = TextFile.read(path).text
    } catch {
      throw new ManifestError(path, 'Cannot read package manifest')
    }
    try {
      return JSON.parse(text).version
    } catch (error) {
      throw new ManifestError(
        path,
        `Invalid package manifest: ${error.message}`)
    }
  }

  marketplace() {
    return new Marketplace(this.#root)
  }

  skills() {
    return this.marketplace()
      .plugins()
      .flatMap((plugin) => plugin.skills())
  }

  file(relativePath) {
    return TextFile.read(join(this.#root, relativePath))
  }

  exists(relativePath) {
    return existsSync(join(this.#root, relativePath))
  }

  filesNamed(fileName, underRelativeDir) {
    const directory = join(this.#root, underRelativeDir)
    if (!existsSync(directory)) return []
    const files = []
    this.#collectNamed(directory, fileName, files)
    return files.sort().map((path) => relative(this.#root, path))
  }

  markdownFiles() {
    const files = []
    this.#collectMarkdown(this.#root, files)
    return files.sort().map((path) => TextFile.read(path))
  }

  scriptFiles() {
    const directory = join(this.#root, 'scripts')
    if (!existsSync(directory)) return []
    const files = []
    this.#collectScripts(directory, files)
    return files.sort().map((path) => TextFile.read(path))
  }

  #collectMarkdown(directory, files) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (Repository.#SKIPPED_DIRECTORIES.has(entry.name)) continue
        this.#collectMarkdown(join(directory, entry.name), files)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      if (Repository.#SKIPPED_FILES.has(entry.name)) continue
      files.push(join(directory, entry.name))
    }
  }

  #collectScripts(directory, files) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        this.#collectScripts(join(directory, entry.name), files)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue
      files.push(join(directory, entry.name))
    }
  }

  #collectNamed(directory, fileName, files) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        this.#collectNamed(join(directory, entry.name), fileName, files)
        continue
      }
      if (!entry.isFile() || entry.name !== fileName) continue
      files.push(join(directory, entry.name))
    }
  }
}
