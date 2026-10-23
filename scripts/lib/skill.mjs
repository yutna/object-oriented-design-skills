import { existsSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

import { Frontmatter } from './frontmatter.mjs'
import { MarkdownDocument } from './markdown-document.mjs'
import { TextFile } from './text-file.mjs'

export class Skill {
  #directory
  #frontmatter
  #metadata
  #document

  constructor(directory, textFile) {
    this.#directory = directory
    this.#frontmatter = Frontmatter.of(textFile)
    const metadata = this.#frontmatter.get('metadata')
    this.#metadata = Object.freeze(
      metadata !== null &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata)
        ? { ...metadata }
        : {})
    this.#document = new MarkdownDocument(textFile)
    Object.freeze(this)
  }

  get directoryName() {
    return basename(this.#directory)
  }

  get frontmatter() {
    return this.#frontmatter
  }

  get name() {
    return this.#frontmatter.get('name')
  }

  get description() {
    return this.#frontmatter.get('description')
  }

  get metadata() {
    return this.#metadata
  }

  get document() {
    return this.#document
  }

  get path() {
    return join(this.#directory, 'SKILL.md')
  }

  referenceEntries() {
    const directory = join(this.#directory, 'references')
    if (!existsSync(directory)) return []
    return readdirSync(directory, { withFileTypes: true })
      .map((entry) => entry.isDirectory()
        ? `${entry.name}/`
        : entry.name)
      .sort((left, right) => left.localeCompare(right))
  }

  referenceFiles() {
    const directory = join(this.#directory, 'references')
    if (!existsSync(directory)) return []
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => TextFile.read(join(directory, entry.name)))
  }
}
