import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ReferencesCheck } from '../../../scripts/lib/checks/references-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-references-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    await mkdir(join(root, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(root, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'fixture-market',
        plugins: [
          {
            name: 'fixture-plugin',
            version: '1.0.0',
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
        version: '1.0.0'
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(body) {
    const directory = join(
      this.#root,
      'plugins',
      'core',
      'skills',
      'oo-demo')
    await mkdir(join(directory, 'references'), { recursive: true })
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      'name: oo-demo',
      'description: Use when testing.',
      'license: MIT',
      'metadata:',
      '  version: 1.0.0',
      '  pack: object-oriented-design-skills',
      '---',
      '',
      body
    ].join('\n'))
  }

  skillPath() {
    return join(
      this.#root,
      'plugins',
      'core',
      'skills',
      'oo-demo',
      'SKILL.md')
  }

  referencePath(name) {
    return join(
      this.#root,
      'plugins',
      'core',
      'skills',
      'oo-demo',
      'references',
      name)
  }

  async writeReference(name, text) {
    await writeFile(this.referencePath(name), text)
  }

  async makeReferenceDirectory(name) {
    await mkdir(this.referencePath(name), { recursive: true })
  }

  inspect() {
    const report = new Report()
    new ReferencesCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class SkillBody {
  static withFurtherReading(links = []) {
    return [
      '# Demo',
      '',
      '## Further reading',
      '',
      ...links,
      ''
    ].join('\n')
  }
}

class LongReference {
  static text(withContents = true, firstAnchor = 'one') {
    const lines = ['# Long', '']
    if (withContents) {
      lines.push(
        `- [One](#${firstAnchor})`,
        '- [Two](#two)',
        '- [Three](#three)',
        '')
    }
    lines.push('## One', '')
    for (let index = 0; index < 40; index += 1) {
      lines.push(`One line ${index}.`)
    }
    lines.push('## Two', '')
    for (let index = 0; index < 40; index += 1) {
      lines.push(`Two line ${index}.`)
    }
    lines.push('## Three', '')
    for (let index = 0; index < 40; index += 1) {
      lines.push(`Three line ${index}.`)
    }
    return lines.join('\n')
  }
}

test('a skill with linked references passes the references check', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(SkillBody.withFurtherReading([
      '- [Short](references/short.md)',
      '- [Long][long]',
      '',
      '[long]: references/long.md'
    ]))
    await repository.writeReference('short.md', '# Short\n')
    await repository.writeReference('long.md', LongReference.text())
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 2 reference(s)'])
  } finally {
    await repository.close()
  }
})

test('every reference entry is a .md file, not a directory or other file', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(SkillBody.withFurtherReading())
    await repository.writeReference('notes.txt', 'not markdown\n')
    await repository.makeReferenceDirectory('nested')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath()}: ` +
      'reference notes.txt must be a .md file, not another file type'))
    assert.ok(report.lines().includes(
      `error ${repository.skillPath()}: ` +
      'reference nested/ must be a .md file, not a directory'))
  } finally {
    await repository.close()
  }
})

test('every reference is linked from Further reading', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(SkillBody.withFurtherReading())
    await repository.writeReference('short.md', '# Short\n')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath()}: ` +
      'reference short.md must be linked from Further reading'))
  } finally {
    await repository.close()
  }
})

test('a references link in SKILL.md resolves', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(SkillBody.withFurtherReading([
      '- [Short](references/short.md)',
      '- [Missing](references/missing.md)'
    ]))
    await repository.writeReference('short.md', '# Short\n')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath()}: ` +
      'link references/missing.md does not resolve'))
  } finally {
    await repository.close()
  }
})

test('a long reference has a contents list before its first section', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(SkillBody.withFurtherReading([
      '- [Long](references/long.md)'
    ]))
    await repository.writeReference(
      'long.md',
      LongReference.text(false))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.referencePath('long.md')}: ` +
      'needs a contents list before its first level-two heading'))
  } finally {
    await repository.close()
  }
})

test('a contents list links only to the reference anchors', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(SkillBody.withFurtherReading([
      '- [Long](references/long.md)'
    ]))
    await repository.writeReference(
      'long.md',
      LongReference.text(true, 'missing'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.referencePath('long.md')}: ` +
      'contents list link #missing does not resolve'))
  } finally {
    await repository.close()
  }
})
