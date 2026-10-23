import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FrontmatterError } from '../../scripts/lib/errors.mjs'
import { Frontmatter } from '../../scripts/lib/frontmatter.mjs'
import { TextFile } from '../../scripts/lib/text-file.mjs'

test('a valid frontmatter exposes its keys and values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-frontmatter-'))
  try {
    const path = join(root, 'SKILL.md')
    await writeFile(path, [
      '---',
      'name: oo-demo',
      'metadata:',
      '  version: 0.1.0',
      '---',
      '# Demo',
      ''
    ].join('\n'))
    const frontmatter = Frontmatter.of(TextFile.read(path))
    assert.deepEqual(frontmatter.keys(), ['name', 'metadata'])
    assert.equal(frontmatter.has('name'), true)
    assert.equal(frontmatter.has('missing'), false)
    assert.equal(frontmatter.get('name'), 'oo-demo')
    assert.deepEqual(frontmatter.get('metadata'), { version: '0.1.0' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('missing frontmatter throws FrontmatterError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-frontmatter-'))
  try {
    const path = join(root, 'SKILL.md')
    await writeFile(path, 'name: oo-demo\n')
    assert.throws(
      () => Frontmatter.of(TextFile.read(path)),
      (error) => {
        assert.ok(error instanceof FrontmatterError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('unterminated frontmatter throws FrontmatterError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-frontmatter-'))
  try {
    const path = join(root, 'SKILL.md')
    await writeFile(path, '---\nname: oo-demo\n')
    assert.throws(
      () => Frontmatter.of(TextFile.read(path)),
      (error) => {
        assert.ok(error instanceof FrontmatterError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('invalid YAML throws FrontmatterError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-frontmatter-'))
  try {
    const path = join(root, 'SKILL.md')
    await writeFile(path, '---\nname: [\n---\n')
    assert.throws(
      () => Frontmatter.of(TextFile.read(path)),
      (error) => {
        assert.ok(error instanceof FrontmatterError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('frontmatter that is not a mapping throws FrontmatterError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-frontmatter-'))
  try {
    const path = join(root, 'SKILL.md')
    await writeFile(path, '---\n- one\n- two\n---\n')
    assert.throws(
      () => Frontmatter.of(TextFile.read(path)),
      (error) => {
        assert.ok(error instanceof FrontmatterError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
