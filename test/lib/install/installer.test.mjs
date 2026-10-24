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
    `would copy oo-constructing-valid-objects -> ${
      join('/home', '.claude', 'skills', 'oo-constructing-valid-objects')}`))
  assert.ok(lines.includes(
    `would copy oo-deciding-object-or-data -> ${
      join('/home', '.claude', 'skills', 'oo-deciding-object-or-data')}`))
  assert.ok(lines.includes(
    `would copy oo-design -> ${
      join('/home', '.claude', 'skills', 'oo-design')}`))
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
    `would copy oo-modeling-values-and-entities -> ${
      join('/home', '.claude', 'skills', 'oo-modeling-values-and-entities')}`))
  assert.ok(lines.includes(
    "add this block to the project's CLAUDE.md:"))
  assert.ok(lines.includes('## Object-oriented design skills'))
  assert.equal(lines.at(-1), 'ok 8 skill(s) considered')
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
      'copied oo-constructing-valid-objects -> ' +
      join(home, '.claude', 'skills', 'oo-constructing-valid-objects')))
    assert.ok(first.lines().includes(
      'copied oo-deciding-object-or-data -> ' +
      join(home, '.claude', 'skills', 'oo-deciding-object-or-data')))
    assert.ok(first.lines().includes(
      'copied oo-design -> ' +
      join(home, '.claude', 'skills', 'oo-design')))
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
      'copied oo-modeling-values-and-entities -> ' +
      join(home, '.claude', 'skills', 'oo-modeling-values-and-entities')))
    assert.equal(first.lines().at(-1), 'ok 8 skill(s) considered')
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
      'skipped oo-constructing-valid-objects ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-deciding-object-or-data ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-design (already installed; --force replaces it)'))
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
      'skipped oo-modeling-values-and-entities ' +
      '(already installed; --force replaces it)'))
    assert.equal(second.lines().at(-1), 'ok 8 skill(s) considered')
    assert.equal(readFileSync(installed, 'utf8'), text)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
