import { readFileSync } from 'node:fs'

import { UnreadableFileError } from './errors.mjs'

export class TextFile {
  #path
  #text

  static read(path) {
    try {
      return new TextFile(path, readFileSync(path, 'utf8'))
    } catch {
      throw new UnreadableFileError(path)
    }
  }

  constructor(path, rawText) {
    this.#path = path
    this.#text = rawText
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    Object.freeze(this)
  }

  get path() {
    return this.#path
  }

  get text() {
    return this.#text
  }

  get lineCount() {
    return this.lines().length
  }

  lines() {
    const lines = this.#text.split('\n')
    if (lines.at(-1) === '') lines.pop()
    return lines
  }
}
