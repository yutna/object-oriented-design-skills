import test from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipReader } from '../../../scripts/lib/install/ownership-reader.mjs'
import { NotInstalled } from '../../../scripts/lib/install/not-installed.mjs'
import { OwnedByThisPack } from '../../../scripts/lib/install/owned-by-this-pack.mjs'
import { OwnedByOtherPack } from '../../../scripts/lib/install/owned-by-other-pack.mjs'
import { Unmarked } from '../../../scripts/lib/install/unmarked.mjs'

class FakeFileSystem {
  #directories
  #texts

  constructor(directories, texts) {
    this.#directories = new Set(directories)
    this.#texts = new Map(texts)
  }

  exists(path) {
    return this.#directories.has(path)
  }

  readText(path) {
    return this.#texts.get(path) ?? null
  }
}

class SkillText {
  static of(pack) {
    return [
      '---',
      'name: oo-design',
      'metadata:',
      pack === null ? '  version: 0.4.0' : `  pack: ${pack}`,
      '---',
      ''
    ].join('\n')
  }
}

const DIRECTORY = '/home/.claude/skills/oo-design'
const SKILL = `${DIRECTORY}/SKILL.md`

test('OwnershipReader returns NotInstalled when the directory is absent', () => {
  const reader = new OwnershipReader(new FakeFileSystem([], []))
  assert.ok(reader.of(DIRECTORY) instanceof NotInstalled)
})

test('OwnershipReader returns OwnedByThisPack for this pack', () => {
  const reader = new OwnershipReader(new FakeFileSystem(
    [DIRECTORY],
    [[SKILL, SkillText.of('object-oriented-design-skills')]]))
  assert.ok(reader.of(DIRECTORY) instanceof OwnedByThisPack)
})

test('OwnershipReader returns OwnedByOtherPack with its pack', () => {
  const reader = new OwnershipReader(new FakeFileSystem(
    [DIRECTORY],
    [[SKILL, SkillText.of('another-pack')]]))
  const ownership = reader.of(DIRECTORY)
  assert.ok(ownership instanceof OwnedByOtherPack)
  assert.equal(ownership.pack, 'another-pack')
})

test('OwnershipReader returns Unmarked for a directory with no pack', () => {
  const reader = new OwnershipReader(new FakeFileSystem(
    [DIRECTORY],
    [[SKILL, SkillText.of(null)]]))
  assert.ok(reader.of(DIRECTORY) instanceof Unmarked)
})
