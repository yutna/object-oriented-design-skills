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
    'would copy oo-bounding-contexts -> ' +
    join('/home', '.claude', 'skills', 'oo-bounding-contexts')))
  assert.ok(lines.includes(
    'would copy oo-choosing-a-pattern -> ' +
    join('/home', '.claude', 'skills', 'oo-choosing-a-pattern')))
  assert.ok(lines.includes(
    `would copy oo-choosing-composition-over-inheritance -> ${
      join('/home', '.claude', 'skills',
        'oo-choosing-composition-over-inheritance')}`))
  assert.ok(lines.includes(
    `would copy oo-constructing-valid-objects -> ${
      join('/home', '.claude', 'skills', 'oo-constructing-valid-objects')}`))
  assert.ok(lines.includes(
    `would copy oo-crossing-system-boundaries -> ${
      join('/home', '.claude', 'skills',
        'oo-crossing-system-boundaries')}`))
  assert.ok(lines.includes(
    `would copy oo-deciding-object-or-data -> ${
      join('/home', '.claude', 'skills', 'oo-deciding-object-or-data')}`))
  assert.ok(lines.includes(
    `would copy oo-design -> ${
      join('/home', '.claude', 'skills', 'oo-design')}`))
  assert.ok(lines.includes(
    `would copy oo-designing-aggregates -> ${
      join('/home', '.claude', 'skills', 'oo-designing-aggregates')}`))
  assert.ok(lines.includes(
    `would copy oo-designing-failure-behaviour -> ${
      join('/home', '.claude', 'skills',
        'oo-designing-failure-behaviour')}`))
  assert.ok(lines.includes(
    `would copy oo-designing-interfaces -> ${
      join('/home', '.claude', 'skills', 'oo-designing-interfaces')}`))
  assert.ok(lines.includes(
    `would copy oo-designing-repositories -> ${
      join('/home', '.claude', 'skills', 'oo-designing-repositories')}`))
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
    `would copy oo-layering-the-system -> ${
      join('/home', '.claude', 'skills',
        'oo-layering-the-system')}`))
  assert.ok(lines.includes(
    `would copy oo-limiting-what-an-object-knows -> ${
      join('/home', '.claude', 'skills',
        'oo-limiting-what-an-object-knows')}`))
  assert.ok(lines.includes(
    `would copy oo-making-illegal-states-impossible -> ${
      join('/home', '.claude', 'skills',
        'oo-making-illegal-states-impossible')}`))
  assert.ok(lines.includes(
    `would copy oo-making-work-reliable -> ${
      join('/home', '.claude', 'skills',
        'oo-making-work-reliable')}`))
  assert.ok(lines.includes(
    `would copy oo-managing-shared-state -> ${
      join('/home', '.claude', 'skills',
        'oo-managing-shared-state')}`))
  assert.ok(lines.includes(
    `would copy oo-modeling-lifecycles -> ${
      join('/home', '.claude', 'skills',
        'oo-modeling-lifecycles')}`))
  assert.ok(lines.includes(
    `would copy oo-modeling-values-and-entities -> ${
      join('/home', '.claude', 'skills', 'oo-modeling-values-and-entities')}`))
  assert.ok(lines.includes(
    `would copy oo-naming-classes-and-methods -> ${
      join('/home', '.claude', 'skills', 'oo-naming-classes-and-methods')}`))
  assert.ok(lines.includes(
    `would copy oo-organising-modules -> ${
      join('/home', '.claude', 'skills', 'oo-organising-modules')}`))
  assert.ok(lines.includes(
    `would copy oo-patterns-the-language-provides -> ${
      join('/home', '.claude', 'skills',
        'oo-patterns-the-language-provides')}`))
  assert.ok(lines.includes(
    `would copy oo-placing-domain-logic -> ${
      join('/home', '.claude', 'skills', 'oo-placing-domain-logic')}`))
  assert.ok(lines.includes(
    `would copy oo-publishing-domain-events -> ${
      join('/home', '.claude', 'skills', 'oo-publishing-domain-events')}`))
  assert.ok(lines.includes(
    `would copy oo-replacing-conditionals-with-polymorphism -> ${
      join('/home', '.claude', 'skills',
        'oo-replacing-conditionals-with-polymorphism')}`))
  assert.ok(lines.includes(
    `would copy oo-separating-presentation-from-domain -> ${
      join('/home', '.claude', 'skills',
        'oo-separating-presentation-from-domain')}`))
  assert.ok(lines.includes(
    `would copy oo-separating-reads-from-writes -> ${
      join('/home', '.claude', 'skills',
        'oo-separating-reads-from-writes')}`))
  assert.ok(lines.includes(
    `would copy oo-speaking-the-domain-language -> ${
      join('/home', '.claude', 'skills',
        'oo-speaking-the-domain-language')}`))
  assert.ok(lines.includes(
    `would copy oo-taming-persistence -> ${
      join('/home', '.claude', 'skills', 'oo-taming-persistence')}`))
  assert.ok(lines.includes(
    "add this block to the project's CLAUDE.md:"))
  assert.ok(lines.includes('## Object-oriented design skills'))
  assert.equal(lines.at(-1), 'ok 35 skill(s) considered')
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
      'copied oo-bounding-contexts -> ' +
      join(home, '.claude', 'skills', 'oo-bounding-contexts')))
    assert.ok(first.lines().includes(
      'copied oo-choosing-a-pattern -> ' +
      join(home, '.claude', 'skills', 'oo-choosing-a-pattern')))
    assert.ok(first.lines().includes(
      'copied oo-choosing-composition-over-inheritance -> ' +
      join(home, '.claude', 'skills',
        'oo-choosing-composition-over-inheritance')))
    assert.ok(first.lines().includes(
      'copied oo-constructing-valid-objects -> ' +
      join(home, '.claude', 'skills', 'oo-constructing-valid-objects')))
    assert.ok(first.lines().includes(
      'copied oo-crossing-system-boundaries -> ' +
      join(home, '.claude', 'skills',
        'oo-crossing-system-boundaries')))
    assert.ok(first.lines().includes(
      'copied oo-deciding-object-or-data -> ' +
      join(home, '.claude', 'skills', 'oo-deciding-object-or-data')))
    assert.ok(first.lines().includes(
      'copied oo-design -> ' +
      join(home, '.claude', 'skills', 'oo-design')))
    assert.ok(first.lines().includes(
      'copied oo-designing-aggregates -> ' +
      join(home, '.claude', 'skills', 'oo-designing-aggregates')))
    assert.ok(first.lines().includes(
      'copied oo-designing-failure-behaviour -> ' +
      join(home, '.claude', 'skills',
        'oo-designing-failure-behaviour')))
    assert.ok(first.lines().includes(
      'copied oo-designing-interfaces -> ' +
      join(home, '.claude', 'skills', 'oo-designing-interfaces')))
    assert.ok(first.lines().includes(
      'copied oo-designing-repositories -> ' +
      join(home, '.claude', 'skills', 'oo-designing-repositories')))
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
      'copied oo-layering-the-system -> ' +
      join(home, '.claude', 'skills', 'oo-layering-the-system')))
    assert.ok(first.lines().includes(
      'copied oo-limiting-what-an-object-knows -> ' +
      join(home, '.claude', 'skills',
        'oo-limiting-what-an-object-knows')))
    assert.ok(first.lines().includes(
      'copied oo-making-illegal-states-impossible -> ' +
      join(home, '.claude', 'skills',
        'oo-making-illegal-states-impossible')))
    assert.ok(first.lines().includes(
      'copied oo-making-work-reliable -> ' +
      join(home, '.claude', 'skills',
        'oo-making-work-reliable')))
    assert.ok(first.lines().includes(
      'copied oo-managing-shared-state -> ' +
      join(home, '.claude', 'skills',
        'oo-managing-shared-state')))
    assert.ok(first.lines().includes(
      'copied oo-modeling-lifecycles -> ' +
      join(home, '.claude', 'skills',
        'oo-modeling-lifecycles')))
    assert.ok(first.lines().includes(
      'copied oo-modeling-values-and-entities -> ' +
      join(home, '.claude', 'skills', 'oo-modeling-values-and-entities')))
    assert.ok(first.lines().includes(
      'copied oo-naming-classes-and-methods -> ' +
      join(home, '.claude', 'skills', 'oo-naming-classes-and-methods')))
    assert.ok(first.lines().includes(
      'copied oo-organising-modules -> ' +
      join(home, '.claude', 'skills', 'oo-organising-modules')))
    assert.ok(first.lines().includes(
      'copied oo-patterns-the-language-provides -> ' +
      join(home, '.claude', 'skills',
        'oo-patterns-the-language-provides')))
    assert.ok(first.lines().includes(
      'copied oo-placing-domain-logic -> ' +
      join(home, '.claude', 'skills', 'oo-placing-domain-logic')))
    assert.ok(first.lines().includes(
      'copied oo-publishing-domain-events -> ' +
      join(home, '.claude', 'skills', 'oo-publishing-domain-events')))
    assert.ok(first.lines().includes(
      'copied oo-replacing-conditionals-with-polymorphism -> ' +
      join(home, '.claude', 'skills',
        'oo-replacing-conditionals-with-polymorphism')))
    assert.ok(first.lines().includes(
      'copied oo-separating-presentation-from-domain -> ' +
      join(home, '.claude', 'skills',
        'oo-separating-presentation-from-domain')))
    assert.ok(first.lines().includes(
      'copied oo-separating-reads-from-writes -> ' +
      join(home, '.claude', 'skills',
        'oo-separating-reads-from-writes')))
    assert.ok(first.lines().includes(
      'copied oo-speaking-the-domain-language -> ' +
      join(home, '.claude', 'skills',
        'oo-speaking-the-domain-language')))
    assert.ok(first.lines().includes(
      'copied oo-taming-persistence -> ' +
      join(home, '.claude', 'skills', 'oo-taming-persistence')))
    assert.equal(first.lines().at(-1), 'ok 35 skill(s) considered')
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
      'skipped oo-bounding-contexts ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-choosing-a-pattern ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-choosing-composition-over-inheritance ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-constructing-valid-objects ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-crossing-system-boundaries ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-deciding-object-or-data ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-design (already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-designing-aggregates ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-designing-failure-behaviour ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-designing-interfaces ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-designing-repositories ' +
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
      'skipped oo-layering-the-system ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-limiting-what-an-object-knows ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-making-illegal-states-impossible ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-making-work-reliable ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-managing-shared-state ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-modeling-lifecycles ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-modeling-values-and-entities ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-naming-classes-and-methods ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-organising-modules ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-patterns-the-language-provides ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-placing-domain-logic ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-publishing-domain-events ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-replacing-conditionals-with-polymorphism ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-separating-presentation-from-domain ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-separating-reads-from-writes ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-speaking-the-domain-language ' +
      '(already installed; --force replaces it)'))
    assert.ok(second.lines().includes(
      'skipped oo-taming-persistence ' +
      '(already installed; --force replaces it)'))
    assert.equal(second.lines().at(-1), 'ok 35 skill(s) considered')
    assert.equal(readFileSync(installed, 'utf8'), text)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
