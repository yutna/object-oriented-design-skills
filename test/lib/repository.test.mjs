import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ManifestError } from '../../scripts/lib/errors.mjs'
import { Repository } from '../../scripts/lib/repository.mjs'

test('a valid repository with one plugin and two skills', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-repository-'))
  try {
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '9.9.9' }))
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture-market',
        plugins: [
          {
            name: 'fixture-plugin',
            version: '9.9.9',
            source: './plugins/core'
          }
        ]
      }))

    const pluginDirectory = join(root, 'plugins', 'core')
    await mkdir(join(pluginDirectory, '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(pluginDirectory, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'fixture-plugin', version: '9.9.9' }))
    await mkdir(
      join(pluginDirectory, 'skills', 'oo-second', 'references'),
      { recursive: true })
    await writeFile(
      join(pluginDirectory, 'skills', 'oo-second', 'SKILL.md'),
      '---\nname: oo-second\n---\n# Second\n')
    await writeFile(
      join(
        pluginDirectory,
        'skills',
        'oo-second',
        'references',
        'note.md'),
      '# Note\n')
    await mkdir(join(pluginDirectory, 'skills', 'oo-first'), {
      recursive: true
    })
    await writeFile(
      join(pluginDirectory, 'skills', 'oo-first', 'SKILL.md'),
      '---\nname: oo-first\n---\n# First\n')

    await writeFile(join(root, 'README.md'), '# Readme\n')
    await mkdir(join(root, 'docs'), { recursive: true })
    await writeFile(join(root, 'docs', 'guide.md'), '# Guide\n')
    await mkdir(join(root, 'node_modules'), { recursive: true })
    await writeFile(
      join(root, 'node_modules', 'ignored.md'),
      '# Ignored\n')
    await mkdir(join(root, '.git'), { recursive: true })
    await writeFile(join(root, '.git', 'ignored.md'), '# Ignored\n')
    await mkdir(join(root, '.claude'), { recursive: true })
    await writeFile(
      join(root, '.claude', 'ignored.md'),
      '# Ignored\n')
    await writeFile(join(root, 'OOP_SOURCES.md'), '# Ignored\n')
    await writeFile(join(root, 'PRIVATE-NOTES.md'), '# Ignored\n')

    const repository = Repository.at(root)
    assert.equal(repository.root, root)
    assert.equal(repository.packageVersion, '9.9.9')
    assert.equal(repository.marketplace().name, 'fixture-market')
    assert.deepEqual(
      repository.skills().map((skill) => skill.directoryName),
      ['oo-first', 'oo-second'])
    assert.equal(repository.file('README.md').text, '# Readme\n')
    assert.deepEqual(
      repository.markdownFiles().map((file) => file.path),
      [
        join(root, 'README.md'),
        join(root, 'docs', 'guide.md'),
        join(pluginDirectory, 'skills', 'oo-first', 'SKILL.md'),
        join(pluginDirectory, 'skills', 'oo-second', 'SKILL.md'),
        join(
          pluginDirectory,
          'skills',
          'oo-second',
          'references',
          'note.md')
      ].sort())
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Repository.at on this repository finds the forty-five skills and the package version', async () => {
  const root = process.cwd()
  const repository = Repository.at(root)
  const packageData = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(repository.packageVersion, packageData.version)
  assert.deepEqual(
    repository.skills().map((skill) => skill.name).sort(),
    [
      'oo-assigning-responsibilities',
      'oo-bounding-contexts',
      'oo-choosing-a-pattern',
      'oo-choosing-composition-over-inheritance',
      'oo-commenting-what-code-cannot',
      'oo-constructing-valid-objects',
      'oo-crossing-system-boundaries',
      'oo-deciding-object-or-data',
      'oo-design',
      'oo-designing-aggregates',
      'oo-designing-failure-behaviour',
      'oo-designing-for-testability',
      'oo-designing-interfaces',
      'oo-designing-repositories',
      'oo-designing-what-to-record',
      'oo-diagnosing-coupling',
      'oo-documenting-design-decisions',
      'oo-encapsulating-state-and-behaviour',
      'oo-encapsulating-what-varies',
      'oo-hiding-implementation',
      'oo-honouring-substitutability',
      'oo-inverting-dependencies',
      'oo-layering-the-system',
      'oo-limiting-what-an-object-knows',
      'oo-making-illegal-states-impossible',
      'oo-making-work-reliable',
      'oo-managing-shared-state',
      'oo-modeling-lifecycles',
      'oo-modeling-values-and-entities',
      'oo-naming-classes-and-methods',
      'oo-organising-modules',
      'oo-patterns-the-language-provides',
      'oo-placing-domain-logic',
      'oo-publishing-domain-events',
      'oo-recognising-antipatterns',
      'oo-refactoring-toward-object-design',
      'oo-replacing-conditionals-with-polymorphism',
      'oo-reviewing-object-design',
      'oo-separating-presentation-from-domain',
      'oo-separating-reads-from-writes',
      'oo-speaking-the-domain-language',
      'oo-taming-persistence',
      'oo-testing-object-oriented-code',
      'oo-working-with-legacy-code',
      'oo-working-within-a-framework'
    ])
  const markdownPaths = repository.markdownFiles()
    .map((file) => file.path)
  assert.ok(markdownPaths.includes(
    join(root, 'plugins', 'core', 'skills', 'oo-design', 'SKILL.md')))
  assert.ok(markdownPaths.includes(
    join(
      root,
      'plugins',
      'core',
      'skills',
      'oo-assigning-responsibilities',
      'SKILL.md')))
  assert.ok(!markdownPaths.includes(join(root, 'OOP_SOURCES.md')))
})

test('scriptFiles lists every .mjs under scripts in path order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-scripts-'))
  try {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    await mkdir(join(root, 'scripts', 'lib', 'checks'), {
      recursive: true
    })
    await writeFile(join(root, 'scripts', 'entry.mjs'), 'export {}\n')
    await writeFile(
      join(root, 'scripts', 'lib', 'second.mjs'),
      'export class Second {}\n')
    await writeFile(
      join(root, 'scripts', 'lib', 'first.mjs'),
      'export class First {}\n')
    await writeFile(
      join(root, 'scripts', 'lib', 'checks', 'deep.mjs'),
      'export class Deep {}\n')
    await writeFile(join(root, 'scripts', 'ignored.txt'), 'ignored\n')

    const files = Repository.at(root).scriptFiles()
    assert.deepEqual(files.map((file) => file.path), [
      join(root, 'scripts', 'entry.mjs'),
      join(root, 'scripts', 'lib', 'checks', 'deep.mjs'),
      join(root, 'scripts', 'lib', 'first.mjs'),
      join(root, 'scripts', 'lib', 'second.mjs')
    ])
    assert.equal(files[2].text, 'export class First {}\n')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('scriptFiles is empty when scripts does not exist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-no-scripts-'))
  try {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    assert.deepEqual(Repository.at(root).scriptFiles(), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('exists is true for a file or a directory and false otherwise', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-exists-'))
  try {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    await mkdir(join(root, 'plugins'))
    await writeFile(join(root, 'README.md'), '# Readme\n')

    const repository = Repository.at(root)
    assert.equal(repository.exists('README.md'), true)
    assert.equal(repository.exists('plugins'), true)
    assert.equal(repository.exists('missing'), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('filesNamed returns sorted relative paths and skips node_modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-files-named-'))
  try {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    await mkdir(join(root, 'plugins', 'core', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      '{}')
    await writeFile(
      join(root, 'plugins', 'core', 'package.json'),
      '{}')
    await mkdir(join(root, 'plugins', 'other', 'deep'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'other', 'deep', 'package.json'),
      '{}')
    await mkdir(join(root, 'plugins', 'node_modules', 'nested'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'node_modules', 'nested', 'package.json'),
      '{}')
    await writeFile(join(root, 'plugins', 'core', 'other.json'), '{}')

    const repository = Repository.at(root)
    assert.deepEqual(repository.filesNamed('package.json', 'plugins'), [
      join('plugins', 'core', 'package.json'),
      join('plugins', 'other', 'deep', 'package.json')
    ])
    assert.deepEqual(repository.filesNamed('package.json', 'missing'), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Repository.at on an empty mkdtemp folder does not throw', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-empty-repository-'))
  try {
    assert.doesNotThrow(() => Repository.at(root))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('packageVersion there throws ManifestError whose message holds the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-empty-version-'))
  try {
    const path = join(root, 'package.json')
    assert.throws(
      () => Repository.at(root).packageVersion,
      (error) => error instanceof ManifestError &&
        error.message.includes(path))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
