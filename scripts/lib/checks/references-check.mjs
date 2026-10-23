import { basename, dirname, join, relative, resolve } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { TextFile } from '../text-file.mjs'

export class ReferencesCheck extends Check {
  static #LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\S/
  static #CONTENTS_LINK = /\[[^\]]*\]\(#([^)]*)\)/g
  static #LONG_REFERENCE_LINES = 100
  static #MIN_SECTIONS = 3

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'references'
  }

  inspect(report) {
    const skills = this.#repository.skills()
    let count = 0
    for (const skill of skills) {
      count += this.#inspectSkill(skill, report)
    }
    report.count('reference(s)', count)
  }

  #inspectSkill(skill, report) {
    const entries = skill.referenceEntries()
    const files = new Map(skill.referenceFiles().map((file) => [
      basename(file.path),
      file
    ]))
    this.#inspectEntries(skill, entries, report)
    this.#inspectFurtherReading(skill, entries, report)
    this.#inspectLinks(skill, report)
    this.#inspectContents(entries, files, report)
    return entries.length
  }

  #inspectEntries(skill, entries, report) {
    // A reference is a Markdown file a reader can open beside the skill.
    for (const entry of entries) {
      if (entry.endsWith('/')) {
        report.error(
          skill.path,
          `reference ${entry} must be a .md file, not a directory`)
        continue
      }
      if (!entry.endsWith('.md')) {
        report.error(
          skill.path,
          `reference ${entry} must be a .md file, ` +
          'not another file type')
      }
    }
  }

  #inspectFurtherReading(skill, entries, report) {
    const links = this.#sectionLinks(skill, 'Further reading')
    const linked = new Set()
    for (const link of links) {
      const path = this.#pathOf(link.target)
      if (path === '') continue
      linked.add(resolve(dirname(skill.path), path))
    }
    // Further reading is the one place a skill exposes its references.
    for (const entry of entries) {
      if (entry.endsWith('/') || !entry.endsWith('.md')) continue
      const path = join(dirname(skill.path), 'references', entry)
      if (!linked.has(path)) {
        report.error(
          skill.path,
          `reference ${entry} must be linked from Further reading`)
      }
    }
  }

  #inspectLinks(skill, report) {
    // A reference link must point at a file that ships with the skill.
    for (const link of skill.document.links()) {
      const path = this.#pathOf(link.target)
      if (!this.#isReferencePath(path)) continue
      const resolved = resolve(dirname(skill.path), path)
      const relativePath = relative(this.#repository.root, resolved)
      if (!this.#repository.exists(relativePath)) {
        report.error(skill.path, `link ${link.target} does not resolve`)
      }
    }
  }

  #inspectContents(entries, files, report) {
    for (const entry of entries) {
      if (entry.endsWith('/') || !entry.endsWith('.md')) continue
      const file = files.get(entry)
      if (file === undefined) continue
      if (file.lineCount <= ReferencesCheck.#LONG_REFERENCE_LINES) continue
      const document = new MarkdownDocument(file)
      const headings = document.headings()
      const levelTwo = headings.filter((heading) => heading.level === 2)
      if (levelTwo.length < ReferencesCheck.#MIN_SECTIONS) continue
      // A long reference opens with a contents list so a reader can jump.
      this.#inspectContentsList(file, document, headings, report)
    }
  }

  #inspectContentsList(file, document, headings, report) {
    const first = headings.find((heading) => heading.level === 2)
    const prefix = file.lines().slice(0, first.line - 1)
    const items = prefix.filter((line) =>
      ReferencesCheck.#LIST_ITEM.test(line))
    if (items.length === 0) {
      report.error(
        file.path,
        'needs a contents list before its first level-two heading')
      return
    }
    const anchors = document.anchors()
    const linked = new Set()
    for (const item of items) {
      const matches = [...item.matchAll(ReferencesCheck.#CONTENTS_LINK)]
      if (matches.length === 0) {
        report.error(
          file.path,
          'contents list items must link to its own anchors')
        continue
      }
      for (const match of matches) {
        const anchor = match[1]
        if (!anchors.has(anchor)) {
          report.error(
            file.path,
            `contents list link #${anchor} does not resolve`)
          continue
        }
        linked.add(anchor)
      }
    }
    const levelTwoAnchors = this.#levelTwoAnchors(headings)
    if (levelTwoAnchors.some((anchor) => !linked.has(anchor))) {
      report.error(
        file.path,
        'contents list must link to every level-two heading')
    }
  }

  #levelTwoAnchors(headings) {
    const counts = new Map()
    const anchors = []
    for (const heading of headings) {
      const count = counts.get(heading.slug) ?? 0
      counts.set(heading.slug, count + 1)
      const anchor = count === 0
        ? heading.slug
        : `${heading.slug}-${count}`
      if (heading.level === 2) anchors.push(anchor)
    }
    return anchors
  }

  #sectionLinks(skill, heading) {
    const section = skill.document.section(heading)
    if (section === null) return []
    return new MarkdownDocument(new TextFile(skill.path, section)).links()
  }

  #pathOf(target) {
    const hash = target.indexOf('#')
    const path = hash === -1 ? target : target.slice(0, hash)
    return path.trim()
  }

  #isReferencePath(path) {
    const normalized = path.startsWith('./') ? path.slice(2) : path
    return normalized.startsWith('references/')
  }
}
