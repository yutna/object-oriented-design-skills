import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FileSystem } from '../../../scripts/lib/install/file-system.mjs'
import { Installer } from '../../../scripts/lib/install/installer.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class RecordingFileSystem {
  #calls = []

  exists(path) {
    return false
  }

  readText(path) {
    return null
  }

  copyDirectory(source, target) {
    this.#calls.push(['copy', source, target])
  }

  remove(path) {
    this.#calls.push(['remove', path])
  }

  makeDirectory(path) {
    this.#calls.push(['mkdir', path])
  }

  get calls() {
    return [...this.#calls]
  }
}

test('--dry-run installs nothing and prints the block', () => {
  const fileSystem = new RecordingFileSystem()
  const report = new Report()
  new Installer(
    Repository.at(process.cwd()),
    '/home',
    ['--dry-run'],
    fileSystem).inspect(report)

  assert.deepEqual(fileSystem.calls, [])
  assert.equal(report.failed, false)
  const lines = report.lines()
  assert.ok(lines.includes(
    'would copy oo-assigning-responsibilities -> ' +
    join('/home', '.claude', 'skills', 'oo-assigning-responsibilities')))
  assert.ok(lines.includes(
    `would copy oo-choosing-composition-over-inheritance -> ${
      join('/home', '.claude', 'skills',
        'oo-choosing-composition-over-inheritance')}`))
  assert.ok(lines.includes(
    `would copy oo-constructing-valid-objects -> ${
      join('/home', '.claude', 'skills', 'oo-constructing-valid-objects')}`))
  assert.ok(lines.includes(
    `would copy oo-deciding-object-or-data -> ${
      join('/home', '.claude', 'skills', 'oo-deciding-object-or-data')}`))
  assert.ok(lines.includes(
    `would copy oo-design -> ${
      join('/home', '.claude', 'skills', 'oo-design')}`))
  assert.ok(lines.includes(
    `would copy oo-designing-interfaces -> ${
      join('/home', '.claude', 'skills', 'oo-designing-interfaces')}`))
  assert.ok(lines.includes(
    `would copy oo-diagnosing-coupling -> ${
      join('/home', '.claude', 'skills', 'oo-diagnosing-coupling')}`))
  assert.ok(lines.includes(
    `would copy oo-encapsulating-state-and-behaviour -> ${
      join('/home', '.claude', 'skills',
        'oo-encapsulating-state-and-behaviour')}`))
  assert.ok(lines.includes(
    `would copy oo-encapsulating-what-varies -> ${
      join('/home', '.claude', 'skills', 'oo-encapsulating-what-varies')}`))
  assert.ok(lines.includes(
    `would copy oo-hiding-implementation -> ${
      join('/home', '.claude', 'skills', 'oo-hiding-implementation')}`))
  assert.ok(lines.includes(
    `would copy oo-honouring-substitutability -> ${
      join('/home', '.claude', 'skills',
        'oo-honouring-substitutability')}`))
  assert.ok(lines.includes(
    `would copy oo-inverting-dependencies -> ${
      join('/home', '.claude', 'skills',
        'oo-inverting-dependencies')}`))
  assert.ok(lines.includes(
    `would copy oo-limiting-what-an-object-knows -> ${
      join('/home', '.claude', 'skills',
        'oo-limiting-what-an-object-knows')}`))
  assert.ok(lines.includes(
    `would copy oo-making-illegal-states-impossible -> ${
      join('/home', '.claude', 'skills',
        'oo-making-illegal-states-impossible')}`))
  assert.ok(lines.includes(
    `would copy oo-modeling-values-and-entities -> ${
      join('/home', '.claude', 'skills', 'oo-modeling-values-and-entities')}`))
  assert.ok(lines.includes(
    `would copy oo-naming-classes-and-methods -> ${
      join('/home', '.claude', 'skills', 'oo-naming-classes-and-methods')}`))
  assert.ok(lines.includes(
    `would copy oo-replacing-conditionals-with-polymorphism -> ${
      join('/home', '.claude', 'skills',
        'oo-replacing-conditionals-with-polymorphism')}`))
  assert.ok(lines.includes(
    "add this block to the project's CLAUDE.md:"))
  assert.ok(lines.includes('## Object-oriented design skills'))
  assert.equal(lines.at(-1), 'ok 17 skill(s) considered')
})

test('Installer copies every core skill, then skips them', async () => {
  const home = await mkdtemp(join(tmpdir(), 'oo-installer-'))
  try {
    const repository = Repository.at(process.cwd())
    const first = new Report()
    new Installer(
      repository, home, [], new FileSystem()).inspect(first)
    assert.equal(first.failed, false)
    assert.ok(first.lines().includes(
      'copied oo-assigning-responsibilities -> ' +
      join(home, '.claude', 'skills', 'oo-assigning-responsibilities')))
    assert.ok(first.lines().includes(
      'copied oo-choosing-composition-over-inheritance -> ' +
      join(home, '.claude', 'skills',
        'oo-choosing-composition-over-inheritance')))
    assert.ok(first.lines().includes(
      'copied oo-constructing-valid-objects -> ' +
      join(home, '.claude', 'skills', 'oo-constructing-valid-objects')))
    assert.ok(first.lines().includes(
      'copied oo-deciding-object-or-data -> ' +
      join(home, '.claude', 'skills', 'oo-deciding-object-or-data')))
    assert.ok(first.lines().includes(
      'copied oo-design -> ' +
      join(home, '.claude', 'skills', 'oo-design')))
    assert.ok(first.lines().includes(
      'copied oo-designing-interfaces -> ' +
      join(home, '.claude', 'skills', 'oo-designing-interfaces')))
    assert.ok(first.lines().includes(
      'copied oo-diagnosing-coupling -> ' +
      join(home, '.claude', 'skills', 'oo-diagnosing-coupling')))
    assert.ok(first.lines().includes(
      'copied oo-encapsulating-state-and-behaviour -> ' +
      join(home, '.claude', 'skills',
        'oo-encapsulating-state-and-behaviour')))
    assert.ok(first.lines().includes(
      'copied oo-encapsulating-what-varies -> ' +
      join(home, '.claude', 'skills', 'oo-encapsulating-what-varies')))
    assert.ok(first.lines().includes(
      'copied oo-hiding-implementation -> ' +
      join(home, '.claude', 'skills', 'oo-hiding-implementation')))
    assert.ok(first.lines().includes(
      'copied oo-honouring-substitutability -> ' +
      join(home, '.claude', 'skills', 'oo-honouring-substitutability')))
    assert.ok(first.lines().includes(
      'copied oo-inverting-dependencies -> ' +
      join(home, '.claude', 'skills', 'oo-inverting-dependencies')))
    assert.ok(first.lines().includes(
      'copied oo-limiting-what-an-object-knows -> ' +
      join(home, '.claude', 'skills',
        'oo-limiting-what-an-object-knows')))
    assert.ok(first.lines().includes(
      'copied oo-making-illegal-states-impossible -> ' +
      join(home, '.claude', 'skills',
        'oo-making-illegal-states-impossible')))
    assert.ok(first.lines().includes(
      'copied oo-modeling-values-and-entities -> ' +
      join(home, '.claude', 'skills', 'oo-modeling-values-and-entities')))
    assert.ok(first.lines().includes(
      'copied oo-naming-classes-and-methods -> ' +
      join(home, '.claude', 'skills', 'oo-naming-classes-and-methods')))
    assert.ok(first.lines().includes(
      'copied oo-replacing-conditionals-with-polymorphism -> ' +
      join(home, '.claude', 'skills',
        'oo-replacing-conditionals-with-polymorphism')))
    assert.equal(first.lines().at(-1), 'ok 17 skill(s) considered')
    const installed = join(home, '.claude', 'skills', 'oo-design', 'SKILL.md')
    assert.equal(existsSync(installed), true)
    const text = readFileSync(installed, 'utf8')

    const second = new Report()
    new Installer(
      repository, home, [], new FileSystem()).inspect(second)
    assert.equal(second.failed, false)
    assert.ok(second.lines().includes(
      'skipped oo-assigning-responsibilities ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-choosing-composition-over-inheritance ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-constructing-valid-objects ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-deciding-object-or-data ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-design (already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-designing-interfaces ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-diagnosing-coupling ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-encapsulating-state-and-behaviour ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-encapsulating-what-varies ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-hiding-implementation ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-honouring-substitutability ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-inverting-dependencies ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-limiting-what-an-object-knows ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-making-illegal-states-impossible ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-modeling-values-and-entities ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-naming-classes-and-methods ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-replacing-conditionals-with-polymorphism ' +
      '(already installed; --force replaces it)'))
    assert.equal(second.lines().at(-1), 'ok 17 skill(s) considered')
    assert.equal(readFileSync(installed, 'utf8'), text)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
