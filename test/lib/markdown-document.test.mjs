import test from 'node:test'
import assert from 'node:assert/strict'

import { Heading } from '../../scripts/lib/heading.mjs'
import { MarkdownDocument } from '../../scripts/lib/markdown-document.mjs'
import { TextFile } from '../../scripts/lib/text-file.mjs'

test('a heading inside a fence is not a heading', () => {
  const raw = '```text\n# Not a heading\n```\n# Real heading\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  assert.deepEqual(
    document.headings().map((heading) => heading.text),
    ['Real heading'])
})

test('a fence indented three spaces inside a numbered list', () => {
  const raw = '1. item\n\n   ```text\n   code\n   ```\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  const fences = document.fences()
  assert.equal(fences.length, 1)
  assert.equal(fences[0].language, 'text')
  assert.equal(fences[0].body, 'code')
  assert.equal(fences[0].startLine, 3)
  assert.equal(fences[0].endLine, 5)
})

test('a four-backtick fence that contains a three-backtick line', () => {
  const raw = '````text\n```\ncode\n````\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  const fences = document.fences()
  assert.equal(fences.length, 1)
  assert.equal(fences[0].language, 'text')
  assert.equal(fences[0].body, '```\ncode')
  assert.equal(fences[0].startLine, 1)
  assert.equal(fences[0].endLine, 4)
})

test('section stops at a same-level heading but keeps deeper ones', () => {
  const raw = '# One\nfirst\n## Two\nsecond\n# Three\nthird\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  assert.equal(document.section('One'), 'first\n## Two\nsecond')
  assert.equal(document.section('Two'), 'second')
  assert.equal(document.section('Missing'), null)
})

test('a link inside inline code is not a link', () => {
  const raw = 'Use `[not](a-link)` and [yes](a-target).\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  const links = document.links()
  assert.equal(links.length, 1)
  assert.equal(links[0].label, 'yes')
  assert.equal(links[0].target, 'a-target')
  assert.equal(links[0].line, 1)
  assert.deepEqual(document.inlineCode(), ['[not](a-link)'])
})

test('a reference-style definition is a link outside fences', () => {
  const raw = [
    '[first]: a-target',
    '   [second]: b-target',
    '```text',
    '[third]: c-target',
    '```',
    '[fourth]: d-target',
    ''
  ].join('\n')
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  assert.deepEqual(
    document.links().map((link) => [link.label, link.target, link.line]),
    [
      ['first', 'a-target', 1],
      ['second', 'b-target', 2],
      ['fourth', 'd-target', 6]
    ])
})

test('repeated heading slugs', () => {
  const raw = '# Visit\n## Visit\n### Visit\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  assert.deepEqual([...document.anchors()], ['visit', 'visit-1', 'visit-2'])
})

test('proseWithoutCode blanks inline code without moving lines', () => {
  const raw = '# Title\n\nUse `ISBN` and `Chapter 4` here.\n'
  const document = new MarkdownDocument(new TextFile('note.md', raw))
  const prose = document.prose().split('\n')
  const blanked = document.proseWithoutCode().split('\n')
  assert.deepEqual(
    blanked.map((line) => line.length),
    prose.map((line) => line.length))
  assert.equal(blanked.join('\n').includes('ISBN'), false)
  assert.equal(blanked.join('\n').includes('Chapter 4'), false)
})

test('prose() keeps line count', () => {
  const raw = '# Title\n\n```text\n# hidden\n```\n\nafter\n'
  const file = new TextFile('note.md', raw)
  const document = new MarkdownDocument(file)
  const prose = document.prose().split('\n')
  assert.equal(prose.length, file.lineCount)
  assert.equal(prose[2], '')
  assert.equal(prose[3], '')
  assert.equal(prose[4], '')
  assert.deepEqual(
    document.headings().map((heading) => heading.text),
    ['Title'])
})

test('two Headings with equal fields are equals, and are not when one field differs', () => {
  const first = new Heading(2, 'Visit', 3, 'visit')
  const second = new Heading(2, 'Visit', 3, 'visit')
  const different = new Heading(2, 'Visit', 4, 'visit')
  assert.equal(first.equals(second), true)
  assert.equal(first.equals(different), false)
})
