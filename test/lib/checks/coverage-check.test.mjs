import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CoverageCheck } from '../../../scripts/lib/checks/coverage-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-coverage-'))
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
    for (const [directory, name] of [
      ['core', 'object-oriented-design-skills'],
      ['java', 'object-oriented-design-java']
    ]) {
      await mkdir(join(root, 'plugins', directory, '.claude-plugin'), {
        recursive: true
      })
      await writeFile(
        join(
          root,
          'plugins',
          directory,
          '.claude-plugin',
          'plugin.json'),
        JSON.stringify({ name, version: '1.0.0' }))
    }
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async writeSkill(plugin, name) {
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
      `# ${name}`,
      ''
    ].join('\n'))
  }

  async writeEval(path, text) {
    const target = join(this.#root, path)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, text)
  }

  inspect() {
    const report = new Report()
    new CoverageCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class CoverageFiles {
  static routing(lines, knownMisses = []) {
    return [
      '# Routing Cases',
      '',
      '```text',
      ...lines,
      '```',
      '',
      '## Known misses',
      '',
      '```text',
      ...knownMisses,
      '```',
      ''
    ].join('\n')
  }

  static scenarios(reached) {
    const lines = ['# Scenarios', '']
    for (const [index, skills] of reached.entries()) {
      lines.push(
        `## ${index + 1}. A clinic problem`,
        '',
        '> A clinic prompt.',
        '',
        'Must contain: one thing.',
        '',
        `Should reach ${skills
          .map((skill) => `\`${skill}\``).join(', ')}.`,
        '')
    }
    return lines.join('\n')
  }
}

test('coverage rejects a skill with one routing case', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('core', 'oo-design')
    await repository.writeSkill('core', 'oo-assigning-responsibilities')
    await repository.writeEval(
      'evals/routing-cases.md',
      CoverageFiles.routing([
        'a clinic design -> oo-design',
        'a visit class -> oo-assigning-responsibilities',
        'a slot rule -> oo-assigning-responsibilities'
      ]))
    await repository.writeEval(
      'evals/scenarios.md',
      CoverageFiles.scenarios([
        ['oo-design'],
        ['oo-assigning-responsibilities']
      ]))
    const report = repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      'error evals/routing-cases.md: ' +
        'oo-design has 1 routing case(s); at least 2',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('coverage rejects a core skill with no scenario', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('core', 'oo-design')
    await repository.writeSkill('core', 'oo-assigning-responsibilities')
    await repository.writeEval(
      'evals/routing-cases.md',
      CoverageFiles.routing([
        'a clinic design -> oo-design',
        'a small clinic change -> oo-design',
        'a visit class -> oo-assigning-responsibilities',
        'a slot rule -> oo-assigning-responsibilities'
      ]))
    await repository.writeEval(
      'evals/scenarios.md',
      CoverageFiles.scenarios([
        ['oo-assigning-responsibilities']
      ]))
    const report = repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      'error evals/scenarios.md: oo-design has no scenario',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('coverage counts every skill that meets both minimums', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('core', 'oo-design')
    await repository.writeSkill('core', 'oo-assigning-responsibilities')
    await repository.writeEval(
      'evals/routing-cases.md',
      CoverageFiles.routing([
        'a clinic design -> oo-design',
        'a small clinic change -> oo-design',
        'a visit class -> oo-assigning-responsibilities',
        'a slot rule -> oo-assigning-responsibilities'
      ]))
    await repository.writeEval(
      'evals/scenarios.md',
      CoverageFiles.scenarios([
        ['oo-design'],
        ['oo-assigning-responsibilities']
      ]))
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 2 skill(s) covered'])
  } finally {
    await repository.close()
  }
})

test('a language skill needs routing lines but no scenario', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('core', 'oo-design')
    await repository.writeSkill('core', 'oo-other')
    await repository.writeSkill('java', 'oo-java')
    await repository.writeEval(
      'evals/routing-cases.md',
      CoverageFiles.routing([
        'a clinic design -> oo-design',
        'a small clinic change -> oo-design',
        'another clinic problem -> oo-other',
        'a second clinic problem -> oo-other',
        'a java rule -> oo-java',
        'a second java rule -> oo-java'
      ]))
    await repository.writeEval(
      'evals/scenarios.md',
      CoverageFiles.scenarios([
        ['oo-design']
      ]))
    const report = repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      'error evals/scenarios.md: oo-other has no scenario',
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a known miss counts toward the routing minimum', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.writeSkill('core', 'oo-design')
    await repository.writeEval(
      'evals/routing-cases.md',
      CoverageFiles.routing([
        'a clinic design -> oo-design'
      ], [
        'a small clinic change -> oo-design'
      ]))
    await repository.writeEval(
      'evals/scenarios.md',
      CoverageFiles.scenarios([
        ['oo-design']
      ]))
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 1 skill(s) covered'])
  } finally {
    await repository.close()
  }
})

test('coverage keeps both minimums as static fields', () => {
  assert.equal(CoverageCheck.MIN_ROUTING_CASES, 2)
  assert.equal(CoverageCheck.MIN_SCENARIOS, 1)
})
