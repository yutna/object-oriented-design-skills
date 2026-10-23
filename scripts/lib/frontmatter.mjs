import { parse } from 'yaml'

import { FrontmatterError } from './errors.mjs'

export class Frontmatter {
  #data

  static of(textFile) {
    const lines = textFile.lines()
    if (lines[0] !== '---') {
      throw new FrontmatterError(textFile.path, 'Missing frontmatter')
    }
    let end = 1
    while (end < lines.length && lines[end] !== '---') end += 1
    if (end === lines.length) {
      throw new FrontmatterError(
        textFile.path,
        'Unterminated frontmatter')
    }
    let data
    try {
      data = parse(lines.slice(1, end).join('\n'))
    } catch (error) {
      throw new FrontmatterError(
        textFile.path,
        `Invalid YAML: ${error.message}`)
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new FrontmatterError(
        textFile.path,
        'Frontmatter is not a mapping')
    }
    return new Frontmatter(data)
  }

  constructor(data) {
    this.#data = Object.freeze({ ...data })
    Object.freeze(this)
  }

  keys() {
    return Object.keys(this.#data)
  }

  has(key) {
    return Object.hasOwn(this.#data, key)
  }

  get(key) {
    return this.#data[key]
  }
}
