import test from 'node:test'
import assert from 'node:assert/strict'

import { InstallOptions } from '../../../scripts/lib/install/install-options.mjs'
import { RepoError } from '../../../scripts/lib/errors.mjs'

class FakeMarketplace {
  plugins() {
    return [
      { name: 'object-oriented-design-skills' },
      { name: 'another-pack' }
    ]
  }
}

const MARKETPLACE = new FakeMarketplace()

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

test('InstallOptions compares by value', () => {
  const first = InstallOptions.parse(['--plugin', 'another-pack'], MARKETPLACE)
  const second = InstallOptions.parse(['--plugin', 'another-pack'], MARKETPLACE)
  const different = InstallOptions.parse(['--all'], MARKETPLACE)
  assert.equal(first.equals(second), true)
  assert.equal(first.equals(different), false)
  assert.equal(first.equals({ plugins: ['another-pack'] }), false)
})
