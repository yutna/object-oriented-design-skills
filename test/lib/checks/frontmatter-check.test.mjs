import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FrontmatterCheck } from '../../../scripts/lib/checks/frontmatter-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create(packageVersion = '1.0.0') {
    const root = await mkdtemp(join(tmpdir(), 'oo-frontmatter-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: packageVersion }))
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture-market',
        plugins: [
          {
            name: 'fixture-plugin',
            version: packageVersion,
            source: './plugins/core'
          }
        ]
      }))
    await mkdir(join(root, 'plugins', 'core', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'fixture-plugin',
        version: packageVersion
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(directoryName, frontmatterLines) {
    const directory = join(
      this.#root,
      'plugins',
      'core',
      'skills',
      directoryName)
    await mkdir(directory, { recursive: true })
    await writeFile(
      join(directory, 'SKILL.md'),
      ['---', ...frontmatterLines, '---', '# Demo', ''].join('\n'))
  }

  skillPath(directoryName) {
    return join(
      this.#root,
      'plugins',
      'core',
      'skills',
      directoryName,
      'SKILL.md')
  }

  inspect() {
    const report = new Report()
    new FrontmatterCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class ValidSkill {
  static lines() {
    return [
      'name: oo-demo',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ]
  }
}

test('a valid skill passes the frontmatter check', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', ValidSkill.lines())
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 1 skill(s)'])
  } finally {
    await repository.close()
  }
})

test('frontmatter keys must be exactly name, description, license and metadata', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      ...ValidSkill.lines(),
      'extra: true'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'frontmatter keys must be exactly name, description, license and ' +
      'metadata'))
  } finally {
    await repository.close()
  }
})

test('license must be MIT', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: Use when testing the check.',
      'license: Apache-2.0',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: license must be MIT`))
  } finally {
    await repository.close()
  }
})

test('metadata keys must be exactly version and pack', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills',
      '  extra: true'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'metadata keys must be exactly version and pack'))
  } finally {
    await repository.close()
  }
})

test('name must equal the directory name', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-other',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'name must equal the directory name'))
  } finally {
    await repository.close()
  }
})

test('name must match the oo- pattern', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('bad_name', [
      'name: bad_name',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('bad_name')}: ` +
      'name must match ^oo-[a-z0-9]+(-[a-z0-9]+)*$'))
  } finally {
    await repository.close()
  }
})

test('name must be at most 64 characters', async () => {
  const repository = await TempRepository.create()
  const name = `oo-${'a'.repeat(65)}`
  try {
    await repository.writeSkill(name, [
      `name: ${name}`,
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath(name)}: ` +
      'name must be at most 64 characters'))
  } finally {
    await repository.close()
  }
})

test('description must be a non-empty string', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: ""',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'description must be a non-empty string'))
  } finally {
    await repository.close()
  }
})

test('description must start with Use when', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: Designs things.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'description must start with "Use when "'))
  } finally {
    await repository.close()
  }
})

test('description must be at most 160 characters', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      `description: Use when ${'a'.repeat(160)}`,
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'description must be at most 160 characters'))
  } finally {
    await repository.close()
  }
})

test('description must not contain < or >', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: Use when <testing> the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'description must not contain < or >'))
  } finally {
    await repository.close()
  }
})

test('description must not match another skill', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-first', ValidSkill.lines())
    await repository.writeSkill('oo-second', [
      'name: oo-second',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-first')}: ` +
      'description must not match another skill'))
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-second')}: ` +
      'description must not match another skill'))
  } finally {
    await repository.close()
  }
})

test('metadata.pack must be object-oriented-design-skills', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: another-pack'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'metadata.pack must be object-oriented-design-skills'))
  } finally {
    await repository.close()
  }
})

test('metadata.version must equal the package version', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-demo', [
      'name: oo-demo',
      'description: Use when testing the check.',
      'license: MIT',
      'metadata:',
      '  version: 0.9.0',
      '  pack: object-oriented-design-skills'
    ])
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'metadata.version must equal the package version'))
  } finally {
    await repository.close()
  }
})
