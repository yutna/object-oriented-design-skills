import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
  writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

import { CreateFile } from '../../../scripts/lib/negative/create-file.mjs'
import { RemoveFile } from '../../../scripts/lib/negative/remove-file.mjs'
import { ReplaceText } from '../../../scripts/lib/negative/replace-text.mjs'
import { RepoError } from '../../../scripts/lib/errors.mjs'

class TempDirectory {
  static create() {
    return new TempDirectory(
      mkdtempSync(join(tmpdir(), 'oo-negative-')))
  }

  #root

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  write(path, text) {
    const target = join(this.#root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, text, 'utf8')
  }

  read(path) {
    return readFileSync(join(this.#root, path), 'utf8')
  }

  exists(path) {
    return existsSync(join(this.#root, path))
  }

  close() {
    rmSync(this.#root, { recursive: true, force: true })
  }
}

test('ReplaceText throws when the find text is absent', () => {
  const directory = TempDirectory.create()
  try {
    directory.write('file.txt', 'alpha\n')
    const mutation = new ReplaceText('file.txt', 'missing', 'x')
    assert.throws(
      () => mutation.apply(directory.root),
      (error) => error instanceof RepoError &&
        error.message.includes('file.txt'))
  } finally {
    directory.close()
  }
})

test('ReplaceText writes LF from a CRLF file', () => {
  const directory = TempDirectory.create()
  try {
    directory.write('file.txt', 'alpha\r\nbeta\r\n')
    new ReplaceText('file.txt', 'alpha', 'ALPHA')
      .apply(directory.root)
    assert.equal(directory.read('file.txt'), 'ALPHA\nbeta\n')
  } finally {
    directory.close()
  }
})

test('CreateFile and RemoveFile change the copy', () => {
  const directory = TempDirectory.create()
  try {
    new CreateFile('nested/file.txt', 'hello\n')
      .apply(directory.root)
    assert.equal(directory.read('nested/file.txt'), 'hello\n')
    new RemoveFile('nested/file.txt').apply(directory.root)
    assert.equal(directory.exists('nested/file.txt'), false)
  } finally {
    directory.close()
  }
})
