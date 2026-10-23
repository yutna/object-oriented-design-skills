import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FileWriter } from '../../scripts/lib/file-writer.mjs'

test('FileWriter writes the given text to a path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-file-writer-'))
  try {
    const path = join(root, 'note.md')
    await writeFile(path, 'old\n')
    new FileWriter().write(path, 'new\n')
    assert.equal(await readFile(path, 'utf8'), 'new\n')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
