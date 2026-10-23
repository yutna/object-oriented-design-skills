import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, lstatSync } from 'node:fs'
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FileSystem } from '../../../scripts/lib/install/file-system.mjs'
import { LocalLinks } from '../../../scripts/lib/install/local-links.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

const ROOT = join('/repo')
const SKILLS = join(ROOT, '.claude', 'skills')

class FakeFileSystem {
  #directories = new Set()
  #links = new Set()
  #entries = new Map()
  #calls = []

  exists(path) {
    return this.#directories.has(path)
  }

  isLink(path) {
    return this.#links.has(path)
  }

  readDirectory(path) {
    return [...(this.#entries.get(path) ?? [])]
  }

  makeDirectory(path) {
    this.#directories.add(path)
    this.#calls.push(['mkdir', path])
  }

  remove(path) {
    this.#links.delete(path)
    this.#directories.delete(path)
    this.#calls.push(['remove', path])
  }

  link(target, path) {
    this.#links.add(path)
    this.#calls.push(['link', target, path])
  }

  addDirectory(path) {
    this.#directories.add(path)
  }

  addLink(path) {
    this.#directories.add(path)
    this.#links.add(path)
  }

  addNonLink(path) {
    this.#directories.add(path)
  }

  setEntries(path, entries) {
    this.#entries.set(path, entries)
  }

  get calls() {
    return [...this.#calls]
  }
}

class FakeSkill {
  constructor(name) {
    this.directoryName = name
    this.path = join(
      ROOT, 'plugins', 'core', 'skills', name, 'SKILL.md')
  }
}

class FakeRepository {
  constructor(skills) {
    this.root = ROOT
    this.skills = skills
  }

  marketplace() {
    return {
      plugins: () => [{
        name: 'object-oriented-design-skills',
        skills: () => this.skills
      }]
    }
  }
}

test('LocalLinks links a selected skill', () => {
  const fileSystem = new FakeFileSystem()
  const report = new Report()
  new LocalLinks(
    new FakeRepository([new FakeSkill('oo-design')]),
    [],
    fileSystem).inspect(report)

  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), ['ok 1 link(s)'])
  assert.deepEqual(fileSystem.calls, [
    ['mkdir', SKILLS],
    [
      'link',
      join(ROOT, 'plugins', 'core', 'skills', 'oo-design'),
      join(SKILLS, 'oo-design')
    ]
  ])
})

test('LocalLinks replaces an existing link', () => {
  const fileSystem = new FakeFileSystem()
  fileSystem.addDirectory(SKILLS)
  fileSystem.addLink(join(SKILLS, 'oo-design'))
  const report = new Report()
  new LocalLinks(
    new FakeRepository([new FakeSkill('oo-design')]),
    [],
    fileSystem).inspect(report)

  assert.deepEqual(report.lines(), ['ok 1 link(s)'])
  assert.deepEqual(fileSystem.calls, [
    ['remove', join(SKILLS, 'oo-design')],
    [
      'link',
      join(ROOT, 'plugins', 'core', 'skills', 'oo-design'),
      join(SKILLS, 'oo-design')
    ]
  ])
})

test('LocalLinks refuses a non-link', () => {
  const fileSystem = new FakeFileSystem()
  fileSystem.addDirectory(SKILLS)
  fileSystem.addNonLink(join(SKILLS, 'oo-design'))
  const report = new Report()
  new LocalLinks(
    new FakeRepository([new FakeSkill('oo-design')]),
    [],
    fileSystem).inspect(report)

  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    `error ${join(SKILLS, 'oo-design')}: is not a link; left in place`,
    'failed: 1 error(s)'
  ])
  assert.deepEqual(fileSystem.calls, [])
})

test('LocalLinks removes only links', () => {
  const fileSystem = new FakeFileSystem()
  fileSystem.addDirectory(SKILLS)
  fileSystem.setEntries(SKILLS, ['oo-design', 'keep'])
  fileSystem.addLink(join(SKILLS, 'oo-design'))
  fileSystem.addNonLink(join(SKILLS, 'keep'))
  const report = new Report()
  new LocalLinks(
    new FakeRepository([new FakeSkill('oo-design')]),
    ['--remove'],
    fileSystem).inspect(report)

  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    `error ${join(SKILLS, 'keep')}: is not a link; left in place`,
    'failed: 1 error(s)'
  ])
  assert.deepEqual(fileSystem.calls, [
    ['remove', join(SKILLS, 'oo-design')]
  ])
})

test('link-local links, then removes, in a small repository copy', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-link-local-'))
  try {
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture',
        plugins: [{
          name: 'object-oriented-design-skills',
          version: '0.5.0',
          source: './plugins/core'
        }]
      }))
    await mkdir(
      join(root, 'plugins', 'core', '.claude-plugin'),
      { recursive: true })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'object-oriented-design-skills',
        version: '0.5.0',
        skills: './skills/'
      }))
    for (const name of ['oo-assigning-responsibilities', 'oo-design']) {
      await mkdir(
        join(root, 'plugins', 'core', 'skills', name),
        { recursive: true })
      await writeFile(
        join(root, 'plugins', 'core', 'skills', name, 'SKILL.md'),
        [
          '---',
          `name: ${name}`,
          'description: Use when testing the local link.',
          'license: MIT',
          'metadata:',
          '  version: 0.5.0',
          '  pack: object-oriented-design-skills',
          '---',
          '',
          `# ${name}`,
          ''
        ].join('\n'))
    }
    await mkdir(join(root, '.claude', 'work'), { recursive: true })
    await writeFile(
      join(root, '.claude', 'work', 'keep.txt'), 'keep')

    const repository = Repository.at(root)
    const skills = join(root, '.claude', 'skills')
    const linkReport = new Report()
    new LocalLinks(repository, [], new FileSystem()).inspect(linkReport)
    assert.equal(linkReport.failed, false)
    assert.equal(linkReport.lines().at(-1), 'ok 2 link(s)')
    assert.equal(lstatSync(join(skills, 'oo-design')).isSymbolicLink(), true)
    for (const name of ['oo-assigning-responsibilities', 'oo-design']) {
      assert.equal(existsSync(
        join(root, 'plugins', 'core', 'skills', name, 'SKILL.md')), true)
    }

    const removeReport = new Report()
    new LocalLinks(
      repository, ['--remove'], new FileSystem()).inspect(removeReport)
    assert.equal(removeReport.failed, false)
    assert.equal(removeReport.lines().at(-1), 'ok 2 link(s) removed')
    assert.equal(existsSync(skills), false)
    assert.equal(existsSync(join(root, '.claude', 'work', 'keep.txt')), true)
    for (const name of ['oo-assigning-responsibilities', 'oo-design']) {
      assert.equal(existsSync(
        join(root, 'plugins', 'core', 'skills', name, 'SKILL.md')), true)
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
