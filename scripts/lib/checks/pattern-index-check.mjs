import { relative, sep } from 'node:path'

import { Check } from '../check.mjs'
import { RepoError } from '../errors.mjs'
import { PatternName } from './pattern-name.mjs'

export class PatternIndexCheck extends Check {
  static #INDEX_PATH =
    'plugins/core/skills/oo-design/references/pattern-index.md'
  static #CATALOGUE_PATH = 'plugins/core/skills/' +
    'oo-choosing-a-pattern/references/patterns-by-problem.md'
  static #ITEM = /^- \*\*(.+?)\.\*\*/
  static #DEFINITION = /^\s*\[([^\]]+)\]:\s*(\S+)\s*$/
  static #REFERENCE = /\[([^\]]+)\]\[([^\]]+)\]/g

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'pattern-index'
  }

  inspect(report) {
    if (!this.#repository.exists(PatternIndexCheck.#INDEX_PATH)) {
      // The index is the subject, so its absence stops the run.
      throw new RepoError(
        `pattern index: ${PatternIndexCheck.#INDEX_PATH} is missing`)
    }
    const file = this.#repository.file(PatternIndexCheck.#INDEX_PATH)
    const items = this.#itemsIn(file.text)
    // A run that read no index item has measured nothing.
    report.count('pattern(s)', items.length)
    this.#inspectDuplicates(items, report)
    this.#inspectOrder(items, report)
    this.#inspectLinks(items, file.text, report)
    this.#inspectMentions(items, report)
    this.#inspectCatalogue(items, report)
  }

  #inspectDuplicates(items, report) {
    const seen = new Set()
    for (const item of items) {
      const name = item.name.toLowerCase()
      if (seen.has(name)) {
        // A name may appear once, whatever its case.
        this.#error(report, item, `"${item.name}" appears twice`)
        continue
      }
      seen.add(name)
    }
  }

  #inspectOrder(items, report) {
    for (let index = 1; index < items.length; index += 1) {
      const above = items[index - 1].name.toLowerCase()
      const name = items[index].name.toLowerCase()
      // Character-code order keeps the index stable on every machine.
      if (name < above) {
        this.#error(
          report,
          items[index],
          `"${items[index].name}" is out of alphabetical order`)
      }
    }
  }

  #inspectLinks(items, text, report) {
    const definitions = this.#definitionsIn(text)
    const targets = new Set(this.#repository.skills()
      .map((skill) => `../../${skill.directoryName}/SKILL.md`))
    for (const item of items) {
      if (this.#linksSkill(item.text, definitions, targets)) continue
      // Every item must name the skill that treats or names it.
      this.#error(report, item, `"${item.name}" links no skill`)
    }
  }

  #inspectMentions(items, report) {
    const files = this.#repository.markdownFiles()
      .filter((file) => {
        const path = this.#pathOf(file)
        return path.startsWith('plugins/') &&
          path !== PatternIndexCheck.#INDEX_PATH
      })
    for (const item of items) {
      const pattern = new PatternName(item.name)
      if (files.some((file) => pattern.foundIn(file.text))) continue
      // Any Markdown text names a pattern, a code fence included.
      this.#error(
        report,
        item,
        `"${item.name}" is named nowhere in the pack`)
    }
  }

  #inspectCatalogue(items, report) {
    const file = this.#repository.file(PatternIndexCheck.#CATALOGUE_PATH)
    const entries = this.#itemsIn(file.text)
    const names = new Set(items.map((item) => item.name.toLowerCase()))
    for (const entry of entries) {
      if (names.has(entry.name.toLowerCase())) continue
      // A catalogue pattern without an index item has no skill pointer.
      report.error(
        `${PatternIndexCheck.#CATALOGUE_PATH}:${entry.line}`,
        `pattern index: "${entry.name}" from the catalogue has no entry`)
    }
  }

  #itemsIn(text) {
    const items = []
    let lines = null
    for (const [index, line] of text.split('\n').entries()) {
      const match = PatternIndexCheck.#ITEM.exec(line)
      if (match !== null) {
        if (lines !== null) items.push(lines)
        lines = { name: match[1].trim(), line: index + 1, text: [line] }
        continue
      }
      if (lines === null) continue
      if (line.trim() === '') {
        items.push(lines)
        lines = null
        continue
      }
      lines.text.push(line)
    }
    if (lines !== null) items.push(lines)
    return items.map(({ name, line, text: itemLines }) =>
      Object.freeze({ name, line, text: itemLines.join('\n') }))
  }

  #definitionsIn(text) {
    const definitions = new Map()
    for (const line of text.split('\n')) {
      const match = PatternIndexCheck.#DEFINITION.exec(line)
      if (match === null) continue
      definitions.set(match[1], match[2])
    }
    return definitions
  }

  #linksSkill(text, definitions, targets) {
    for (const match of text.matchAll(PatternIndexCheck.#REFERENCE)) {
      const target = definitions.get(match[2])
      if (target !== undefined && targets.has(target)) return true
    }
    return false
  }

  #error(report, item, message) {
    report.error(
      `${PatternIndexCheck.#INDEX_PATH}:${item.line}`,
      `pattern index: ${message}`)
  }

  #pathOf(file) {
    // A report reads the same on every platform.
    return relative(this.#repository.root, file.path)
      .split(sep)
      .join('/')
  }
}
