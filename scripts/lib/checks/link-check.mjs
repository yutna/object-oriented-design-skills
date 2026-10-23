import { dirname, relative, resolve } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { TextFile } from '../text-file.mjs'

export class LinkCheck extends Check {
  static #EXTERNAL = Object.freeze([
    'http:',
    'https:',
    'mailto:'
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'link'
  }

  inspect(report) {
    let count = 0
    for (const file of this.#repository.markdownFiles()) {
      const document = new MarkdownDocument(file)
      for (const link of document.links()) {
        if (this.#isExternal(link.target)) continue
        count += 1
        this.#inspectLink(file, document, link, report)
      }
    }
    report.count('link(s)', count)
  }

  #inspectLink(file, document, link, report) {
    const { path, anchor } = this.#split(link.target)
    if (path === '') {
      // An anchor that names no heading scrolls nowhere.
      if (!document.anchors().has(anchor)) {
        report.error(
          file.path,
          `link anchor does not exist: ${link.target}`)
      }
      return
    }
    const resolved = resolve(dirname(file.path), path)
    const relativePath = relative(this.#repository.root, resolved)
    // A relative link that does not resolve leaves the reader at a dead end.
    if (!this.#repository.exists(relativePath)) {
      report.error(
        file.path,
        `link target does not exist: ${link.target}`)
      return
    }
    if (anchor === null) return
    // An anchor in another file must name one of that file's headings.
    if (!path.endsWith('.md')) {
      report.error(
        file.path,
        `link anchor target is not Markdown: ${link.target}`)
      return
    }
    const target = new MarkdownDocument(TextFile.read(resolved))
    if (!target.anchors().has(anchor)) {
      report.error(
        file.path,
        `link anchor does not exist: ${link.target}`)
    }
  }

  #split(target) {
    const hash = target.indexOf('#')
    if (hash === -1) return { path: target.trim(), anchor: null }
    return {
      path: target.slice(0, hash).trim(),
      anchor: target.slice(hash + 1).trim()
    }
  }

  #isExternal(target) {
    return LinkCheck.#EXTERNAL.some((prefix) =>
      target.startsWith(prefix))
  }
}
