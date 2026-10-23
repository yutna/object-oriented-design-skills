import test from 'node:test'
import assert from 'node:assert/strict'

import { UnreadableFileError } from '../../scripts/lib/errors.mjs'
import { TextFile } from '../../scripts/lib/text-file.mjs'

test('CRLF input', () => {
  const file = new TextFile('note.md', 'one\r\ntwo\r\n')
  assert.equal(file.text, 'one\ntwo\n')
  assert.deepEqual(file.lines(), ['one', 'two'])
  assert.equal(file.lineCount, 2)
})

test('lone CR', () => {
  const file = new TextFile('note.md', 'one\rtwo\r')
  assert.equal(file.text, 'one\ntwo\n')
  assert.deepEqual(file.lines(), ['one', 'two'])
  assert.equal(file.lineCount, 2)
})

test('BOM', () => {
  const file = new TextFile('note.md', '\uFEFF# Title\n')
  assert.equal(file.text, '# Title\n')
  assert.deepEqual(file.lines(), ['# Title'])
  assert.equal(file.lineCount, 1)
})

test('no final newline', () => {
  const file = new TextFile('note.md', 'one\ntwo')
  assert.deepEqual(file.lines(), ['one', 'two'])
  assert.equal(file.lineCount, 2)
})

test('missing file throws UnreadableFileError with the path', () => {
  const path = 'test/lib/does-not-exist.md'
  assert.throws(
    () => TextFile.read(path),
    (error) => {
      assert.ok(error instanceof UnreadableFileError)
      assert.ok(error.message.includes(path))
      return true
    })
})
