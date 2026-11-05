import test from 'node:test'
import assert from 'node:assert/strict'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { FixtureScaffold } from '../../../scripts/lib/evals/fixture-scaffold.mjs'

class FakeRepository {
  #folders

  static with(...folders) {
    return new FakeRepository(folders)
  }

  constructor(folders) {
    this.#folders = new Set(folders)
    Object.freeze(this)
  }

  exists(path) {
    return this.#folders.has(path)
  }
}

test('FixtureScaffold maps fixture.sh to the default fixture', () => {
  const scaffold = FixtureScaffold.of(
    FakeRepository.with('evals/fixture-tasks'), 'fixture.sh')
  assert.equal(scaffold.script, 'fixture.sh')
  assert.equal(scaffold.folder, 'fixture-tasks')
  assert.equal(scaffold.directory, 'evals/fixture-tasks')
  assert.match(scaffold.scriptText, /cp -R "\$here\/fixture-tasks\/\." \./)
  assert.equal(Object.isFrozen(scaffold), true)
})

test('FixtureScaffold maps fixture-<name>.sh to its own fixture', () => {
  const scaffold = FixtureScaffold.of(
    FakeRepository.with('evals/fixture-java'), 'fixture-java.sh')
  assert.equal(scaffold.script, 'fixture-java.sh')
  assert.equal(scaffold.folder, 'fixture-java')
  assert.equal(scaffold.directory, 'evals/fixture-java')
  assert.match(scaffold.scriptText, /cp -R "\$here\/fixture-java\/\." \./)
})

test('FixtureScaffold names the fixture folder a scaffold looks for', () => {
  assert.throws(
    () => FixtureScaffold.of(FakeRepository.with(), 'fixture-java.sh'),
    (error) => error instanceof RepoError &&
      error.message.includes('fixture-java.sh') &&
      error.message.includes('evals/fixture-java/'))
})

test('FixtureScaffold rejects a malformed scaffold name', () => {
  for (const script of ['fixture_Java.sh', 'setup.sh']) {
    assert.throws(
      () => FixtureScaffold.of(FakeRepository.with(), script),
      (error) => error instanceof RepoError &&
        error.message.includes(script) &&
        error.message.includes('evals/fixture-<name>/'))
  }
})
