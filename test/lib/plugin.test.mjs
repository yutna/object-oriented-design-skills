import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ManifestError } from '../../scripts/lib/errors.mjs'
import { Plugin } from '../../scripts/lib/plugin.mjs'

test('a plugin lists only directories with SKILL.md, sorted by name', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-plugin-'))
  try {
    const directory = join(root, 'plugin')
    await mkdir(join(directory, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(directory, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'demo-plugin', version: '1.2.3' }))
    await mkdir(join(directory, 'skills', 'oo-b'), { recursive: true })
    await writeFile(
      join(directory, 'skills', 'oo-b', 'SKILL.md'),
      '---\nname: oo-b\n---\n# B\n')
    await mkdir(join(directory, 'skills', 'oo-a'), { recursive: true })
    await writeFile(
      join(directory, 'skills', 'oo-a', 'SKILL.md'),
      '---\nname: oo-a\n---\n# A\n')
    await mkdir(join(directory, 'skills', 'oo-empty'), { recursive: true })
    await writeFile(
      join(directory, 'skills', 'plain.md'),
      '# Plain file\n')

    const plugin = new Plugin(directory)
    assert.equal(plugin.name, 'demo-plugin')
    assert.equal(plugin.version, '1.2.3')
    assert.equal(plugin.directory, directory)
    assert.deepEqual(
      plugin.skills().map((skill) => skill.directoryName),
      ['oo-a', 'oo-b'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('missing plugin.json throws ManifestError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-plugin-'))
  try {
    const directory = join(root, 'plugin')
    const path = join(directory, '.claude-plugin', 'plugin.json')
    assert.throws(
      () => new Plugin(directory),
      (error) => {
        assert.ok(error instanceof ManifestError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('invalid plugin.json throws ManifestError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-plugin-'))
  try {
    const directory = join(root, 'plugin')
    const path = join(directory, '.claude-plugin', 'plugin.json')
    await mkdir(join(directory, '.claude-plugin'), { recursive: true })
    await writeFile(path, '{')
    assert.throws(
      () => new Plugin(directory),
      (error) => {
        assert.ok(error instanceof ManifestError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
