import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { LocalLinks } from '../../../scripts/lib/install/local-links.mjs'
import { Report } from '../../../scripts/lib/report.mjs'

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
