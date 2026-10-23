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
