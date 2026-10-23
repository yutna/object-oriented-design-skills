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
    `would copy oo-design -> ${
      join('/home', '.claude', 'skills', 'oo-design')}`))
  assert.ok(lines.includes(
    "add this block to the project's CLAUDE.md:"))
  assert.ok(lines.includes('## Object-oriented design skills'))
  assert.equal(lines.at(-1), 'ok 2 skill(s) considered')
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
      'copied oo-design -> ' +
      join(home, '.claude', 'skills', 'oo-design')))
    assert.equal(first.lines().at(-1), 'ok 2 skill(s) considered')
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
      'skipped oo-design (already installed; --force replaces it)'))
    assert.equal(second.lines().at(-1), 'ok 2 skill(s) considered')
    assert.equal(readFileSync(installed, 'utf8'), text)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
