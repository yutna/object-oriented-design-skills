import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

test('Repository.at on this repository finds the two skills and the package version', async () => {
  const root = process.cwd()
  const repository = Repository.at(root)
  const packageData = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(repository.packageVersion, packageData.version)
  assert.deepEqual(
    repository.skills().map((skill) => skill.name).sort(),
    ['oo-assigning-responsibilities', 'oo-design'])
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
