import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RepoError } from '../../scripts/lib/errors.mjs'
import { Report } from '../../scripts/lib/report.mjs'
import { Repository } from '../../scripts/lib/repository.mjs'
import { VersionBump } from '../../scripts/lib/version-bump.mjs'

class MemoryWriter {
  #writes = []

  write(path, text) {
    this.#writes.push({ path, text })
  }

  get writes() {
    return [...this.#writes]
  }
}

class RecordingWriter {
  #writes = []

  write(path, text) {
    writeFileSync(path, text)
    this.#writes.push({ path, text })
  }

  get writes() {
    return [...this.#writes]
  }
}

class Snapshot {
  #contents

  static async take(paths) {
    const contents = new Map()
    for (const path of paths) {
      contents.set(path, await readFile(path, 'utf8'))
    }
    return new Snapshot(contents)
  }

  constructor(contents) {
    this.#contents = contents
  }

  get(path) {
    return this.#contents.get(path)
  }

  paths() {
    return [...this.#contents.keys()]
  }

  changedLines(after) {
    const changes = []
    for (const path of this.paths()) {
      const beforeLines = this.get(path).split('\n')
      const afterLines = after.get(path).split('\n')
      assert.equal(afterLines.length, beforeLines.length, path)
      for (let index = 0; index < beforeLines.length; index += 1) {
        if (beforeLines[index] === afterLines[index]) continue
        changes.push({
          path,
          before: beforeLines[index],
          after: afterLines[index]
        })
      }
    }
    return changes
  }

  equals(other) {
    if (this.paths().length !== other.paths().length) return false
    return this.paths().every((path) =>
      this.get(path) === other.get(path))
  }
}

class TempRepository {
  #root

  static async create({
    packageVersion = '0.2.0',
    missingVersion = null
  } = {}) {
    const root = await mkdtemp(join(tmpdir(), 'oo-version-bump-'))
    await writeFile(
      join(root, 'package.json'),
      TempRepository.#package(packageVersion))
    await writeFile(
      join(root, 'package-lock.json'),
      TempRepository.#lock(packageVersion))
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      TempRepository.#marketplace())
    await mkdir(join(root, 'plugins', 'core', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      TempRepository.#plugin())
    for (const name of ['oo-first', 'oo-second']) {
      await mkdir(
        join(root, 'plugins', 'core', 'skills', name),
        { recursive: true })
      await writeFile(
        join(root, 'plugins', 'core', 'skills', name, 'SKILL.md'),
        TempRepository.#skill(name, name === missingVersion))
    }
    return new TempRepository(root)
  }

  static #package(version) {
    return [
      '{',
      '  "name": "fixture",',
      `  "version": "${version}",`,
      '  "private": true',
      '}',
      ''
    ].join('\n')
  }

  static #lock(version) {
    return [
      '{',
      '  "name": "fixture",',
      `  "version": "${version}",`,
      '  "lockfileVersion": 3,',
      '  "packages": {',
      '    "": {',
      '      "name": "fixture",',
      `      "version": "${version}"`,
      '    }',
      '  }',
      '}',
      ''
    ].join('\n')
  }

  static #marketplace() {
    return [
      '{',
      '  "name": "fixture-market",',
      '  "plugins": [',
      '    {',
      '      "name": "fixture-plugin",',
      '      "version": "0.2.0",',
      '      "source": "./plugins/core",',
      '      "keywords": ["alpha", "beta"]',
      '    }',
      '  ]',
      '}',
      ''
    ].join('\n')
  }

  static #plugin() {
    return [
      '{',
      '  "name": "fixture-plugin",',
      '  "version": "0.2.0",',
      '  "skills": "./skills/",',
      '  "keywords": ["alpha", "beta"]',
      '}',
      ''
    ].join('\n')
  }

  static #skill(name, missingVersion) {
    const metadata = missingVersion
      ? ['metadata:', '  pack: fixture']
      : ['metadata:', '  version: 0.2.0', '  pack: fixture']
    return [
      '---',
      `name: ${name}`,
      'description: Use when testing the version bump.',
      'license: MIT',
      ...metadata,
      '---',
      '',
      `# ${name}`,
      '',
      'The version: 0.2.0 is prose, not frontmatter.',
      ''
    ].join('\n')
  }

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  packagePath() {
    return join(this.#root, 'package.json')
  }

  packageLockPath() {
    return join(this.#root, 'package-lock.json')
  }

  marketplacePath() {
    return join(this.#root, '.claude-plugin', 'marketplace.json')
  }

  pluginPath() {
    return join(
      this.#root,
      'plugins',
      'core',
      '.claude-plugin',
      'plugin.json')
  }

  skillPath(name) {
    return join(
      this.#root,
      'plugins',
      'core',
      'skills',
      name,
      'SKILL.md')
  }

  skillPaths() {
    return ['oo-first', 'oo-second'].map((name) => this.skillPath(name))
  }

  paths() {
    return [
      this.packagePath(),
      this.packageLockPath(),
      this.marketplacePath(),
      this.pluginPath(),
      ...this.skillPaths()
    ]
  }

  async setReleaseVersion(version) {
    await writeFile(this.packagePath(), TempRepository.#package(version))
    await writeFile(this.packageLockPath(), TempRepository.#lock(version))
  }

  run(writer) {
    const report = new Report()
    new VersionBump(Repository.at(this.#root), writer).run(report)
    return report
  }

  async snapshot() {
    return Snapshot.take(this.paths())
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('a temporary repository bumps only version lines', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.setReleaseVersion('0.3.0')
    const before = await repository.snapshot()
    const writer = new RecordingWriter()
    const report = repository.run(writer)
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 4 versioned file(s)'])
    assert.deepEqual(
      writer.writes.map(({ path }) => path),
      [
        repository.skillPath('oo-first'),
        repository.skillPath('oo-second'),
        repository.marketplacePath(),
        repository.pluginPath()
      ])
    const after = await repository.snapshot()
    assert.equal(
      after.get(repository.packagePath()),
      before.get(repository.packagePath()))
    assert.equal(
      after.get(repository.packageLockPath()),
      before.get(repository.packageLockPath()))
    const changes = before.changedLines(after)
    assert.equal(changes.length, 4)
    for (const change of changes) {
      assert.match(
        change.before,
        /^(?:\s*"version": "0\.2\.0",?|  version: 0\.2\.0)$/)
      assert.equal(
        change.after,
        change.before.replace('0.2.0', '0.3.0'))
    }
    const marketplace = JSON.parse(
      after.get(repository.marketplacePath()))
    assert.deepEqual(
      marketplace.plugins.map((entry) => entry.version),
      ['0.3.0'])
    const plugin = JSON.parse(after.get(repository.pluginPath()))
    assert.equal(plugin.version, '0.3.0')
    const lock = JSON.parse(after.get(repository.packageLockPath()))
    assert.equal(lock.version, '0.3.0')
    const bumped = Repository.at(repository.root)
    assert.equal(bumped.packageVersion, '0.3.0')
    assert.deepEqual(
      bumped.skills().map((skill) => skill.metadata.version),
      ['0.3.0', '0.3.0'])
    for (const path of repository.skillPaths()) {
      assert.match(
        after.get(path),
        /The version: 0\.2\.0 is prose, not frontmatter\./)
    }
    const againWriter = new RecordingWriter()
    const againReport = repository.run(againWriter)
    assert.deepEqual(againWriter.writes, [])
    assert.equal(againReport.failed, false)
    assert.deepEqual(againReport.lines(), [
      'changed 0 file(s)',
      'ok 4 versioned file(s)'
    ])
    assert.equal((await repository.snapshot()).equals(after), true)
  } finally {
    await repository.close()
  }
})

test('a SKILL.md without a version line is an error', async () => {
  const repository = await TempRepository.create({
    missingVersion: 'oo-first'
  })
  try {
    await repository.setReleaseVersion('0.3.0')
    const writer = new MemoryWriter()
    const report = repository.run(writer)
    assert.deepEqual(report.lines(), [
      `error ${repository.skillPath('oo-first')}: ` +
      'No "  version:" line in the metadata block',
      'failed: 1 error(s)'
    ])
    assert.deepEqual(
      writer.writes.map(({ path }) => path),
      [
        repository.skillPath('oo-second'),
        repository.marketplacePath(),
        repository.pluginPath()
      ])
  } finally {
    await repository.close()
  }
})

test('an invalid package.json version throws', async () => {
  const repository = await TempRepository.create({
    packageVersion: '0.3'
  })
  try {
    const writer = new MemoryWriter()
    assert.throws(
      () => repository.run(writer),
      (error) => error instanceof RepoError &&
        error.message === 'Invalid version: 0.3')
    assert.deepEqual(writer.writes, [])
  } finally {
    await repository.close()
  }
})
