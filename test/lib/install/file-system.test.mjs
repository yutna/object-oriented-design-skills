import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FileSystem } from '../../../scripts/lib/install/file-system.mjs'

test('FileSystem links and sees a link', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-file-system-'))
  try {
    const target = join(root, 'target')
    await mkdir(target)
    const path = join(root, 'link')
    const fileSystem = new FileSystem()

    fileSystem.link(target, path)

    assert.equal(fileSystem.isLink(path), true)
    assert.equal(fileSystem.isLink(target), false)
    assert.equal(existsSync(path), true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('FileSystem.remove removes a link without its target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-file-system-'))
  try {
    const target = join(root, 'target')
    await mkdir(target)
    await writeFile(join(target, 'keep.txt'), 'keep')
    const link = join(root, 'link')
    await symlink(target, link)

    new FileSystem().remove(link)

    assert.equal(existsSync(link), false)
    assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'keep')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
