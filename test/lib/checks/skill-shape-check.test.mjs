import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SkillShapeCheck } from '../../../scripts/lib/checks/skill-shape-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-skill-shape-'))
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
            name: 'object-oriented-design-skills',
            version: '1.0.0',
            source: './plugins/core'
          },
          {
            name: 'object-oriented-design-java',
            version: '1.0.0',
            source: './plugins/java'
          }
        ]
      }))
    await mkdir(join(root, 'plugins', 'core', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'core', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'object-oriented-design-skills',
        version: '1.0.0'
      }))
    await mkdir(join(root, 'plugins', 'java', '.claude-plugin'), {
      recursive: true
    })
    await writeFile(
      join(root, 'plugins', 'java', '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'object-oriented-design-java',
        version: '1.0.0'
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(name, body, plugin = 'core') {
    const directory = join(
      this.#root,
      'plugins',
      plugin,
      'skills',
      name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      `name: ${name}`,
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

  skillPath(name, plugin = 'core') {
    return join(
      this.#root,
      'plugins',
      plugin,
      'skills',
      name,
      'SKILL.md')
  }

  inspect() {
    const report = new Report()
    new SkillShapeCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class Shape {
  static backLink() {
    return [
      '**In this pack:**',
      '[sizing](../oo-design/SKILL.md#how-much-design-a-task-warrants),',
      '[notation](../oo-design/references/notation.md),',
      '[rule strictness](../oo-design/SKILL.md#how-strictly-a-rule-is-meant).'
    ].join('\n')
  }

  static index() {
    return [
      '# Object-Oriented Design',
      '',
      '## Overview',
      '## How much design a task warrants',
      '## Before designing',
      '## The design loop',
      '## How strictly a rule is meant',
      '## Symptoms to skills',
      '## Red flags',
      '## Further reading',
      ''
    ].join('\n')
  }

  static core(title = 'A Core Skill') {
    return [
      `# ${title}`,
      '',
      Shape.backLink(),
      '',
      '## Overview',
      '## When to use',
      '## When not to use',
      '- The owner is not in question.',
      '- The module is written as data and functions.',
      '## Core rules',
      '## Pattern',
      '## Red flags',
      '## Common mistakes',
      '## Related skills',
      '## Further reading',
      ''
    ].join('\n')
  }

  static languageBackLink() {
    return [
      '**In this pack:** sizing and rule strictness are set by the core',
      "plugin's `oo-design` skill; each rule here keeps a core rule in this",
      'language.'
    ].join('\n')
  }

  static language(title = 'A Java Skill') {
    return [
      `# ${title}`,
      '',
      Shape.languageBackLink(),
      '',
      '## Overview',
      '## When to use',
      '## When not to use',
      '- The code is written in another language.',
      '- The question is about the core rules themselves.',
      '## Core rules',
      '## Pattern',
      '## Red flags',
      '## Common mistakes',
      '## Related skills',
      '## Further reading',
      ''
    ].join('\n')
  }
}

class HouseStyle {
  static of(text) {
    const lines = text.split('\n')
    const section = lines.findIndex((line) =>
      line === '## Skill house style')
    const start = lines.findIndex((line, index) =>
      index > section && line === '```markdown')
    const end = lines.findIndex((line, index) =>
      index > start && line === '```')
    const body = lines.slice(start + 1, end)
    const backStart = body.findIndex((line) =>
      line === '**In this pack:**')
    const backEnd = body.findIndex((line, index) =>
      index > backStart && line.endsWith('.'))
    return {
      backLink: body.slice(backStart, backEnd + 1).join('\n'),
      headings: body
        .filter((line) => line.startsWith('## '))
        .map((line) => line.slice(3))
    }
  }

  static languageBackLink(text) {
    const lines = text.split('\n')
    const section = lines.findIndex((line) =>
      line.trim() === '## Language skill house style')
    const start = lines.findIndex((line, index) =>
      index > section && line.trim() === '```markdown')
    const end = lines.findIndex((line, index) =>
      index > start && line.trim() === '```')
    const body = lines.slice(start + 1, end)
    const indent = body[0].match(/^ */)[0]
    return body
      .map((line) => line.startsWith(indent)
        ? line.slice(indent.length)
        : line)
      .join('\n')
  }
}

test('a valid index and core skill pass the shape check', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-design', Shape.index())
    await repository.writeSkill('oo-demo', Shape.core())
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 2 skill shape(s)'])
  } finally {
    await repository.close()
  }
})

test('the body has exactly one level-one heading', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-demo',
      Shape.core() + '\n# Again\n')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'body must have exactly one level-one heading'))
  } finally {
    await repository.close()
  }
})

test('the index has exactly INDEX_HEADINGS', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-design',
      Shape.index().replace('## Before designing', '## Before'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-design')}: ` +
      'level-two headings must equal INDEX_HEADINGS'))
  } finally {
    await repository.close()
  }
})

test('a core skill has exactly CORE_HEADINGS', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-demo',
      Shape.core().replace('## Common mistakes', '## Mistakes'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'level-two headings must equal CORE_HEADINGS'))
  } finally {
    await repository.close()
  }
})

test('a core skill has the back-link block between title and Overview', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-demo',
      Shape.core().replace(`${Shape.backLink()}\n\n`, ''))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'back-link block must sit between the title and Overview'))
  } finally {
    await repository.close()
  }
})

test('When not to use holds at least two list items', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-demo',
      Shape.core().replace(
        '- The owner is not in question.\n' +
        '- The module is written as data and functions.',
        '- The owner is not in question.'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-demo')}: ` +
      'When not to use must hold at least two list items'))
  } finally {
    await repository.close()
  }
})

test('a language skill has LANGUAGE_BACK_LINK and CORE_HEADINGS', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-design', Shape.index())
    await repository.writeSkill('oo-demo', Shape.core())
    await repository.writeSkill('oo-java', Shape.language(), 'java')
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 3 skill shape(s)'])
  } finally {
    await repository.close()
  }
})

test('a language skill with the core back-link block is an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('oo-java', Shape.core(), 'java')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-java', 'java')}: ` +
      'back-link block must sit between the title and Overview'))
  } finally {
    await repository.close()
  }
})

test('a language skill missing a core heading is an error', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill(
      'oo-java',
      Shape.language().replace('## Common mistakes', '## Mistakes'),
      'java')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.skillPath('oo-java', 'java')}: ` +
      'level-two headings must equal CORE_HEADINGS'))
  } finally {
    await repository.close()
  }
})

test('the shape constants are frozen', () => {
  assert.equal(Array.isArray(SkillShapeCheck.INDEX_HEADINGS), true)
  assert.equal(SkillShapeCheck.INDEX_HEADINGS.length, 8)
  assert.equal(Array.isArray(SkillShapeCheck.CORE_HEADINGS), true)
  assert.equal(SkillShapeCheck.CORE_HEADINGS.length, 9)
  assert.equal(typeof SkillShapeCheck.BACK_LINK, 'string')
  assert.equal(typeof SkillShapeCheck.LANGUAGE_BACK_LINK, 'string')
  assert.equal(Object.isFrozen(SkillShapeCheck.INDEX_HEADINGS), true)
  assert.equal(Object.isFrozen(SkillShapeCheck.CORE_HEADINGS), true)
  assert.equal(Object.isFrozen(SkillShapeCheck.BACK_LINK), true)
  assert.equal(
    Object.isFrozen(SkillShapeCheck.LANGUAGE_BACK_LINK), true)
})

test('AGENTS.md house style equals BACK_LINK and CORE_HEADINGS', () => {
  const text = TextFile.read(join(process.cwd(), 'AGENTS.md')).text
  const style = HouseStyle.of(text)
  assert.equal(style.backLink, SkillShapeCheck.BACK_LINK)
  assert.deepEqual(style.headings, SkillShapeCheck.CORE_HEADINGS)
})

test('AGENTS.md language style equals LANGUAGE_BACK_LINK', () => {
  const text = TextFile.read(join(process.cwd(), 'AGENTS.md')).text
  assert.equal(
    HouseStyle.languageBackLink(text),
    SkillShapeCheck.LANGUAGE_BACK_LINK)
})

test('a changed heading in AGENTS.md no longer matches CORE_HEADINGS', () => {
  const text = TextFile.read(join(process.cwd(), 'AGENTS.md')).text
  const original = HouseStyle.of(text)
  assert.deepEqual(original.headings, SkillShapeCheck.CORE_HEADINGS)
  const changed = HouseStyle.of(
    text.replace('## Core rules', '## Rules'))
  assert.notDeepEqual(changed.headings, SkillShapeCheck.CORE_HEADINGS)
})
