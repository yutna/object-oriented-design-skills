import test from 'node:test'
import assert from 'node:assert/strict'

import { RepoError } from '../../scripts/lib/errors.mjs'
import { Version } from '../../scripts/lib/version.mjs'

test('Version parses a release and a prerelease', () => {
  assert.equal(Version.parse('0.2.0').toString(), '0.2.0')
  assert.equal(
    Version.parse('1.2.3-beta.1').toString(),
    '1.2.3-beta.1')
})

test('Version rejects every text outside the version grammar', () => {
  for (const text of [
    '',
    '1',
    '1.2',
    '1.2.3.4',
    'v1.2.3',
    '1.2.3+meta',
    '1.2.3-',
    ' 1.2.3',
    '1.2.3 '
  ]) {
    assert.throws(
      () => Version.parse(text),
      (error) => error instanceof RepoError &&
        error.message === `Invalid version: ${text}`,
      text)
  }
})

test('Version compares by value and cannot change', () => {
  const version = Version.parse('1.2.3')
  assert.equal(version.equals(Version.parse('1.2.3')), true)
  assert.equal(version.equals(Version.parse('1.2.4')), false)
  assert.equal(version.equals('1.2.3'), false)
  assert.equal(Object.isFrozen(version), true)
})
