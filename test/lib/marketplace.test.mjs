import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ManifestError } from '../../scripts/lib/errors.mjs'
import { Marketplace } from '../../scripts/lib/marketplace.mjs'

test('a marketplace lists its entries and plugins', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-marketplace-'))
  try {
    const pluginDirectory = join(root, 'plugins', 'core')
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'demo-market',
        plugins: [
          {
            name: 'demo-plugin',
            version: '1.2.3',
            source: './plugins/core'
          }
        ]
      }))
    await mkdir(join(pluginDirectory, '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(pluginDirectory, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'demo-plugin', version: '1.2.3' }))

    const marketplace = new Marketplace(root)
    assert.equal(marketplace.name, 'demo-market')
    const entries = marketplace.entries()
    assert.equal(entries.length, 1)
    assert.equal(Object.isFrozen(entries[0]), true)
    assert.deepEqual(entries[0], {
      name: 'demo-plugin',
      version: '1.2.3',
      source: './plugins/core'
    })
    const plugins = marketplace.plugins()
    assert.equal(plugins.length, 1)
    assert.equal(plugins[0].name, 'demo-plugin')
    assert.equal(plugins[0].directory, pluginDirectory)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a source with no plugin.json throws ManifestError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-marketplace-'))
  try {
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'demo-market',
        plugins: [
          {
            name: 'demo-plugin',
            version: '1.2.3',
            source: './plugins/missing'
          }
        ]
      }))
    const path = join(
      root,
      'plugins',
      'missing',
      '.claude-plugin',
      'plugin.json')
    const marketplace = new Marketplace(root)
    assert.throws(
      () => marketplace.plugins(),
      (error) => {
        assert.ok(error instanceof ManifestError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a plugin name that differs from the entry throws ManifestError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-marketplace-'))
  try {
    const pluginDirectory = join(root, 'plugins', 'core')
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'demo-market',
        plugins: [
          {
            name: 'expected-plugin',
            version: '1.2.3',
            source: './plugins/core'
          }
        ]
      }))
    await mkdir(join(pluginDirectory, '.claude-plugin'), {
      recursive: true
    })
    const path = join(pluginDirectory, '.claude-plugin', 'plugin.json')
    await writeFile(
      path,
      JSON.stringify({ name: 'other-plugin', version: '1.2.3' }))
    const marketplace = new Marketplace(root)
    assert.throws(
      () => marketplace.plugins(),
      (error) => {
        assert.ok(error instanceof ManifestError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('missing marketplace.json throws ManifestError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-marketplace-'))
  try {
    const path = join(root, '.claude-plugin', 'marketplace.json')
    assert.throws(
      () => new Marketplace(root),
      (error) => {
        assert.ok(error instanceof ManifestError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('invalid marketplace.json throws ManifestError with the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-marketplace-'))
  try {
    const path = join(root, '.claude-plugin', 'marketplace.json')
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(path, '{')
    assert.throws(
      () => new Marketplace(root),
      (error) => {
        assert.ok(error instanceof ManifestError)
        assert.ok(error.message.includes(path))
        return true
      })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
