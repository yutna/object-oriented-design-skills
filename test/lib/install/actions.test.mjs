import test from 'node:test'
import assert from 'node:assert/strict'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FileSystem } from '../../../scripts/lib/install/file-system.mjs'
import { InstallOptions } from '../../../scripts/lib/install/install-options.mjs'
import { NotInstalled } from '../../../scripts/lib/install/not-installed.mjs'
import { OwnedByOtherPack } from '../../../scripts/lib/install/owned-by-other-pack.mjs'
import { OwnedByThisPack } from '../../../scripts/lib/install/owned-by-this-pack.mjs'
import { Replace } from '../../../scripts/lib/install/replace.mjs'
import { Unmarked } from '../../../scripts/lib/install/unmarked.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

class RecordingFileSystem {
  #calls = []

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

const SOURCE = '/repo/plugins/core/skills/oo-design'
const TARGET = '/home/.claude/skills/oo-design'
const OPTIONS = new InstallOptions(
  ['object-oriented-design-skills'], false, false)
const FORCE = new InstallOptions(
  ['object-oriented-design-skills'], true, false)
const DRY = new InstallOptions(
  ['object-oriented-design-skills'], false, true)
const FORCE_DRY = new InstallOptions(
  ['object-oriented-design-skills'], true, true)

class Run {
  static of(ownership, options) {
    const report = new Report()
    const fileSystem = new RecordingFileSystem()
    const action = ownership.decide(options)
    action.apply(SOURCE, TARGET, fileSystem, report, options.dryRun)
    report.count('skill(s) considered', 1)
    return { report, fileSystem }
  }
}

test('NotInstalled copies the skill', () => {
  const { report, fileSystem } = Run.of(new NotInstalled(), OPTIONS)
  assert.deepEqual(fileSystem.calls, [['copy', SOURCE, TARGET]])
  assert.deepEqual(report.lines(), [
    `copied oo-design -> ${TARGET}`,
    'ok 1 skill(s) considered'
  ])
})

test('OwnedByThisPack skips without force', () => {
  const { report, fileSystem } = Run.of(new OwnedByThisPack(), OPTIONS)
  assert.deepEqual(fileSystem.calls, [])
  assert.deepEqual(report.lines(), [
    'skipped oo-design (already installed; --force replaces it)',
    'ok 1 skill(s) considered'
  ])
})

test('OwnedByThisPack replaces with force', () => {
  const { report, fileSystem } = Run.of(new OwnedByThisPack(), FORCE)
  assert.deepEqual(fileSystem.calls, [
    ['remove', TARGET],
    ['copy', SOURCE, TARGET]
  ])
  assert.deepEqual(report.lines(), [
    `copied oo-design -> ${TARGET}`,
    'ok 1 skill(s) considered'
  ])
})

test('OwnedByOtherPack conflicts with the other pack', () => {
  const { report, fileSystem } = Run.of(
    new OwnedByOtherPack('another-pack'), OPTIONS)
  assert.deepEqual(fileSystem.calls, [])
  assert.deepEqual(report.lines(), [
    `error ${TARGET}: belongs to another-pack; remove it first`,
    'failed: 1 error(s)'
  ])
})

test('Unmarked conflicts with no pack', () => {
  const { report, fileSystem } = Run.of(new Unmarked(), OPTIONS)
  assert.deepEqual(fileSystem.calls, [])
  assert.deepEqual(report.lines(), [
    `error ${TARGET}: claims no pack; ` +
      'remove it first if this pack should own it',
    'failed: 1 error(s)'
  ])
})

test('--dry-run copies nothing and says what it would do', () => {
  const { report, fileSystem } = Run.of(new NotInstalled(), DRY)
  assert.deepEqual(fileSystem.calls, [])
  assert.deepEqual(report.lines(), [
    `would copy oo-design -> ${TARGET}`,
    'ok 1 skill(s) considered'
  ])
})

test('--dry-run replaces nothing and says what it would do', () => {
  const { report, fileSystem } = Run.of(
    new OwnedByThisPack(), FORCE_DRY)
  assert.deepEqual(fileSystem.calls, [])
  assert.deepEqual(report.lines(), [
    `would copy oo-design -> ${TARGET}`,
    'ok 1 skill(s) considered'
  ])
})

test('Replace over a symbolic link leaves the pointed folder intact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-replace-'))
  try {
    const source = join(root, 'source')
    await mkdir(source)
    await writeFile(join(source, 'SKILL.md'), 'new')
    const other = join(root, 'other')
    await mkdir(other)
    await writeFile(join(other, 'keep.txt'), 'keep')
    const target = join(root, 'target')
    await symlink(other, target)

    const report = new Report()
    new Replace().apply(
      source, target, new FileSystem(), report, false)

    assert.equal((await lstat(target)).isSymbolicLink(), false)
    assert.equal(await readFile(join(target, 'SKILL.md'), 'utf8'), 'new')
    assert.equal(await readFile(join(other, 'keep.txt'), 'utf8'), 'keep')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
