import { Fence } from './fence.mjs'
import { Heading } from './heading.mjs'
import { Link } from './link.mjs'

export class MarkdownDocument {
  #textFile

  constructor(textFile) {
    this.#textFile = textFile
  }

  headings() {
    const headings = []
    const lines = this.prose().split('\n')
    for (let index = 0; index < lines.length; index += 1) {
      const match = /^(#{1,6})[ \t]+(.*)$/.exec(lines[index])
      if (match === null) continue
      const text = match[2].trim()
      headings.push(new Heading(
        match[1].length,
        text,
        index + 1,
        this.#slugOf(text)))
    }
    return headings
  }

  fences() {
    const lines = this.#textFile.lines()
    const fences = []
    let index = 0
    while (index < lines.length) {
      const opening = /^([ \t]*)(`{3,})(.*)$/.exec(lines[index])
      if (opening === null) {
        index += 1
        continue
      }
      const indent = opening[1]
      const marker = opening[2]
      const info = opening[3].trim()
      const language = info === '' ? '' : info.split(/\s+/)[0]
      let end = index + 1
      while (end < lines.length) {
        const closing = /^[ \t]*(`{3,})[ \t]*$/.exec(lines[end])
        if (closing !== null && closing[1].length >= marker.length) break
        end += 1
      }
      const body = this.#outdent(
        lines.slice(index + 1, end),
        indent).join('\n')
      const endLine = end < lines.length ? end + 1 : lines.length
      fences.push(new Fence(language, body, index + 1, endLine))
      index = end + 1
    }
    return fences
  }

  section(headingText) {
    const headings = this.headings()
    const heading = headings.find((candidate) =>
      candidate.text === headingText)
    if (heading === undefined) return null
    const next = headings.find((candidate) =>
      candidate.line > heading.line && candidate.level <= heading.level)
    const endLine = next === undefined
      ? this.#textFile.lineCount
      : next.line - 1
    return this.#textFile.lines()
      .slice(heading.line, endLine)
      .join('\n')
      .replace(/^\n+|\n+$/g, '')
  }

  prose() {
    const lines = this.#textFile.lines()
    const fenced = new Set()
    for (const fence of this.fences()) {
      for (let line = fence.startLine; line <= fence.endLine; line += 1) {
        fenced.add(line)
      }
    }
    return lines
      .map((line, index) => (fenced.has(index + 1) ? '' : line))
      .join('\n')
  }

  proseWithoutCode() {
    const text = this.prose()
    const spans = this.#inlineCodeSpans(text)
    let result = ''
    let at = 0
    for (const span of spans) {
      result += text.slice(at, span.start)
      // Same length keeps every line and column where the reader sees it.
      result += ' '.repeat(span.end - span.start)
      at = span.end
    }
    return result + text.slice(at)
  }

  links() {
    const text = this.prose()
    const spans = this.#inlineCodeSpans(text)
    const found = []
    const inlinePattern = /(?<!!)\[([^\]]*)\]\(([^)]*)\)/g
    for (const match of text.matchAll(inlinePattern)) {
      if (this.#inside(spans, match.index)) continue
      found.push({ index: match.index, label: match[1], target: match[2] })
    }
    const referencePattern = /^ {0,3}\[([^\]]*)\]:[ \t]+(\S+)[ \t]*$/gm
    for (const match of text.matchAll(referencePattern)) {
      if (this.#inside(spans, match.index)) continue
      found.push({ index: match.index, label: match[1], target: match[2] })
    }
    found.sort((left, right) => left.index - right.index)
    return found.map(({ index, label, target }) =>
      new Link(label, target, text.slice(0, index).split('\n').length))
  }

  inlineCode() {
    return this.#inlineCodeSpans(this.prose())
      .map((span) => span.code)
  }

  anchors() {
    const slugs = new Set()
    for (const heading of this.headings()) {
      let slug = heading.slug
      if (slugs.has(slug)) {
        let suffix = 1
        while (slugs.has(`${heading.slug}-${suffix}`)) suffix += 1
        slug = `${heading.slug}-${suffix}`
      }
      slugs.add(slug)
    }
    return slugs
  }

  #slugOf(text) {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s/g, '-')
  }

  #inside(spans, index) {
    return spans.some((span) => index >= span.start && index < span.end)
  }

  #outdent(lines, indent) {
    if (indent === '') return lines
    return lines.map((line) =>
      line.startsWith(indent) ? line.slice(indent.length) : line)
  }

  #inlineCodeSpans(text) {
    const spans = []
    let at = 0
    while (at < text.length) {
      if (text[at] !== '`') {
        at += 1
        continue
      }
      let openEnd = at
      while (text[openEnd] === '`') openEnd += 1
      const width = openEnd - at
      let probe = openEnd
      let close = -1
      while (probe < text.length) {
        if (text[probe] !== '`') {
          probe += 1
          continue
        }
        let after = probe
        while (text[after] === '`') after += 1
        if (after - probe === width) {
          close = probe
          break
        }
        probe = after
      }
      if (close === -1) {
        at = openEnd
        continue
      }
      const code = text.slice(openEnd, close)
      if (/\n[ \t]*\n/.test(code)) {
        at = openEnd
        continue
      }
      spans.push({ start: at, end: close + width, code })
      at = close + width
    }
    return spans
  }
}
