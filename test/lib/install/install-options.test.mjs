import test from 'node:test'
import assert from 'node:assert/strict'

import { InstallOptions } from '../../../scripts/lib/install/install-options.mjs'
import { RepoError } from '../../../scripts/lib/errors.mjs'

class FakeMarketplace {
  #plugins

  constructor(plugins) {
    this.#plugins = plugins
  }

  plugins() {
    return this.#plugins
  }
}

const MARKETPLACE = new FakeMarketplace([
  { name: 'object-oriented-design-skills', dependencies: [] },
  { name: 'another-pack', dependencies: [] }
])

test('InstallOptions rejects an unknown option', () => {
  assert.throws(
    () => InstallOptions.parse(['--bogus'], MARKETPLACE),
    (error) => error instanceof RepoError &&
      error.message.includes('--bogus') &&
      error.message.includes('valid options'))
})

test('InstallOptions rejects an unknown plugin', () => {
  assert.throws(
    () => InstallOptions.parse(['--plugin', 'nope'], MARKETPLACE),
    (error) => error instanceof RepoError &&
      error.message.includes('nope') &&
      error.message.includes('object-oriented-design-skills'))
})

test('InstallOptions defaults to this pack', () => {
  const options = InstallOptions.parse([], MARKETPLACE)
  assert.deepEqual(options.plugins, ['object-oriented-design-skills'])
  assert.equal(options.force, false)
  assert.equal(options.dryRun, false)
})

test('InstallOptions keeps repeated plugin choices in order', () => {
  const options = InstallOptions.parse([
    '--plugin', 'another-pack',
    '--plugin', 'object-oriented-design-skills',
    '--force',
    '--dry-run'
  ], MARKETPLACE)
  assert.deepEqual(
    options.plugins,
    ['another-pack', 'object-oriented-design-skills'])
  assert.equal(options.force, true)
  assert.equal(options.dryRun, true)
})

test('InstallOptions --all selects every plugin', () => {
  const options = InstallOptions.parse(['--all'], MARKETPLACE)
  assert.deepEqual(
    options.plugins,
    ['object-oriented-design-skills', 'another-pack'])
})

test('InstallOptions adds a plugin\'s dependencies after it, in order', () => {
  const marketplace = new FakeMarketplace([
    { name: 'first-pack', dependencies: ['second-pack', 'third-pack'] },
    { name: 'second-pack', dependencies: ['fourth-pack'] },
    { name: 'third-pack', dependencies: [] },
    { name: 'fourth-pack', dependencies: [] }
  ])
  const options = InstallOptions.parse(['--plugin', 'first-pack'], marketplace)
  assert.deepEqual(
    options.plugins,
    ['first-pack', 'second-pack', 'third-pack', 'fourth-pack'])
})

test('InstallOptions adds a dependency\'s own dependencies', () => {
  const marketplace = new FakeMarketplace([
    { name: 'outer-pack', dependencies: ['middle-pack'] },
    { name: 'middle-pack', dependencies: ['inner-pack'] },
    { name: 'inner-pack', dependencies: [] }
  ])
  const options = InstallOptions.parse(['--plugin', 'outer-pack'], marketplace)
  assert.deepEqual(
    options.plugins,
    ['outer-pack', 'middle-pack', 'inner-pack'])
})

test('InstallOptions lists a plugin reached twice once', () => {
  const marketplace = new FakeMarketplace([
    { name: 'first-pack', dependencies: ['shared-pack'] },
    { name: 'second-pack', dependencies: ['shared-pack'] },
    { name: 'shared-pack', dependencies: [] }
  ])
  const options = InstallOptions.parse([
    '--plugin', 'first-pack',
    '--plugin', 'second-pack',
    '--plugin', 'first-pack'
  ], marketplace)
  assert.deepEqual(
    options.plugins,
    ['first-pack', 'second-pack', 'shared-pack'])
})

test('InstallOptions rejects an unknown dependency', () => {
  const marketplace = new FakeMarketplace([
    { name: 'broken-pack', dependencies: ['missing-pack'] }
  ])
  assert.throws(
    () => InstallOptions.parse(['--plugin', 'broken-pack'], marketplace),
    (error) => error instanceof RepoError &&
      error.message ===
        'plugin broken-pack lists unknown dependency missing-pack')
})

test('InstallOptions compares by value', () => {
  const first = InstallOptions.parse(['--plugin', 'another-pack'], MARKETPLACE)
  const second = InstallOptions.parse(['--plugin', 'another-pack'], MARKETPLACE)
  const different = InstallOptions.parse(['--all'], MARKETPLACE)
  assert.equal(first.equals(second), true)
  assert.equal(first.equals(different), false)
  assert.equal(first.equals({ plugins: ['another-pack'] }), false)
})
