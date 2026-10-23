import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'

import { EvalBuild } from '../../../scripts/lib/evals/eval-build.mjs'
import { PluginCopy } from '../../../scripts/lib/evals/plugin-copy.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class RepositoryFixture {
  static QUESTION = 'q01-the-slot-rule-keeps-moving'

  static SYSTEM = 'The code the user describes is not in this workspace; ' +
    'answer from the description.'

  static BLOCK = [
    '## Object-oriented design skills',
    '',
    "- This project's own conventions win."
  ].join('\n')

  static TASK = [
    'schema_version: "1.1"',
    'name: t01-check-before-booking',
    'description: >-',
    '  Task: make booking refuse a taken slot.',
    'tags: [task, smoke]',
    'context:',
    '  scaffold_script: fixture.sh',
    'execution:',
    '  prompt: |',
    '    Make booking refuse a taken slot.',
    '  allowed_tools: [Read, Skill, Edit]',
    '  max_turns: 30',
    '  timeout_seconds: 600',
    'graders:',
    '  - name: loaded-any-skill',
    '    type: tool_used',
    '    tool: Skill',
    ''
  ].join('\n')

  static RESTRAINT = [
    'schema_version: "1.1"',
    'name: r01-overnight-duration',
    'description: >-',
    '  Restraint: fix the method body and stop.',
    'tags: [restraint, smoke]',
    'context:',
    '  scaffold_script: fixture.sh',
    'execution:',
    '  prompt: |',
    '    Fix the overnight duration.',
    '  allowed_tools: [Read, Skill, Edit]',
    "  append_system_prompt: The project's own convention wins.",
    'graders:',
    '  - name: loaded-any-skill',
    '    type: tool_used',
    '    tool: Skill',
    ''
  ].join('\n')

  static SCENARIOS = [
    '# Scenarios',
    '',
    '## 1. The slot rule keeps moving',
    '',
    '> Our scheduler checks the slot before it books.',
    '',
    'Must contain: one owner for the rule.',
    '',
    'Should reach `oo-design`.',
    ''
  ].join('\n')

  static SKILL = [
    '---',
    'name: oo-design',
    'description: Use when a clinic design needs work.',
    'license: MIT',
    'metadata:',
    '  version: 0.5.0',
    '  pack: object-oriented-design-skills',
    '---',
    '',
    '# Design',
    ''
  ].join('\n')

  static blockFile() {
    return [
      '# CLAUDE.md block',
      '',
      '```markdown',
      ...RepositoryFixture.BLOCK.split('\n'),
      '```',
      ''
    ].join('\n')
  }

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-eval-build-'))
    const plugin = join(root, 'plugins', 'core')
    await mkdir(join(plugin, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(plugin, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify({
        name: 'object-oriented-design-skills',
        version: '0.5.0'
      })}\n`)
    const skill = join(plugin, 'skills', 'oo-design')
    await mkdir(join(skill, 'references'), { recursive: true })
    await writeFile(join(skill, 'SKILL.md'), RepositoryFixture.SKILL)
    await writeFile(
      join(skill, 'references', 'claude-md-block.md'),
      RepositoryFixture.blockFile())
    const evals = join(root, 'evals')
    await mkdir(join(evals, 'tasks'), { recursive: true })
    await mkdir(join(evals, 'fixture-tasks'), { recursive: true })
    await writeFile(join(evals, 'scenarios.md'), RepositoryFixture.SCENARIOS)
    await writeFile(
      join(evals, 'tasks', 't01-check-before-booking.yaml'),
      RepositoryFixture.TASK)
    await writeFile(
      join(evals, 'tasks', 'r01-overnight-duration.yaml'),
      RepositoryFixture.RESTRAINT)
    await writeFile(
      join(evals, 'fixture-tasks', 'CONVENTIONS.md'),
      '# Conventions\n')
    return new RepositoryFixture(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  source(fileName) {
    return readFileSync(
      join(this.#root, 'evals', 'tasks', fileName), 'utf8')
  }
}

class EvalFixture {
  static async create() {
    const repository = await RepositoryFixture.create()
    return new EvalFixture(repository)
  }

  #repository
  #copy = null

  constructor(repository) {
    this.#repository = repository
  }

  build(options = {}) {
    this.#closeCopy()
    this.#copy = PluginCopy.of(Repository.at(this.#repository.root))
    return new EvalBuild(
      Repository.at(this.#repository.root), this.#copy).build(options)
  }

  read(name, file = 'case.yaml') {
    return readFileSync(
      join(this.#copy.path, 'evals', name, file), 'utf8')
  }

  exists(name, file = 'case.yaml') {
    return existsSync(join(this.#copy.path, 'evals', name, file))
  }

  get copyPath() {
    return this.#copy.path
  }

  get repository() {
    return this.#repository
  }

  async close() {
    this.#closeCopy()
    await rm(this.#repository.root, { recursive: true, force: true })
  }

  #closeCopy() {
    if (this.#copy !== null) {
      this.#copy.close()
      this.#copy = null
    }
  }
}

test('EvalBuild writes a case.yaml for every question and task case',
  async () => {
    const fixture = await EvalFixture.create()
    try {
      const cases = fixture.build()
      assert.deepEqual(
        cases.map(({ name, family }) => [name, family]),
        [
          ['q01-the-slot-rule-keeps-moving', 'question'],
          ['r01-overnight-duration', 'restraint'],
          ['t01-check-before-booking', 'task']
        ])
      const question = parse(fixture.read(RepositoryFixture.QUESTION))
      assert.equal(question.schema_version, '1.1')
      assert.equal(question.name, RepositoryFixture.QUESTION)
      assert.deepEqual(question.tags, ['question'])
      assert.equal(
        question.execution.prompt,
        'Our scheduler checks the slot before it books.')
      assert.deepEqual(
        question.execution.allowed_tools, ['Read', 'Glob', 'Grep', 'Skill'])
      assert.equal(
        question.execution.append_system_prompt, RepositoryFixture.SYSTEM)
    } finally {
      await fixture.close()
    }
  })

test('EvalBuild copies a task case as written', async () => {
  const fixture = await EvalFixture.create()
  try {
    fixture.build()
    assert.equal(
      fixture.read('t01-check-before-booking'),
      fixture.repository.source('t01-check-before-booking.yaml'))
  } finally {
    await fixture.close()
  }
})

test('the block arm appends the CLAUDE.md block to every case', async () => {
  const fixture = await EvalFixture.create()
  try {
    const cases = fixture.build({ arm: 'block' })
    assert.deepEqual(
      cases.map(({ family }) => family),
      ['question', 'restraint', 'task'])
    const question = parse(fixture.read(RepositoryFixture.QUESTION))
    assert.equal(
      question.execution.append_system_prompt,
      `${RepositoryFixture.SYSTEM}\n\n${RepositoryFixture.BLOCK}`)
    const task = parse(fixture.read('t01-check-before-booking'))
    assert.equal(task.execution.append_system_prompt, RepositoryFixture.BLOCK)
    const restraint = parse(fixture.read('r01-overnight-duration'))
    assert.equal(
      restraint.execution.append_system_prompt,
      `The project's own convention wins.\n\n${RepositoryFixture.BLOCK}`)
  } finally {
    await fixture.close()
  }
})

test('the baseline arm builds without the CLAUDE.md block', async () => {
  const fixture = await EvalFixture.create()
  try {
    fixture.build({ arm: 'baseline' })
    const question = parse(fixture.read(RepositoryFixture.QUESTION))
    assert.equal(
      question.execution.append_system_prompt, RepositoryFixture.SYSTEM)
    assert.equal(
      fixture.read('t01-check-before-booking'),
      fixture.repository.source('t01-check-before-booking.yaml'))
  } finally {
    await fixture.close()
  }
})

test('EvalBuild refuses an arm it does not know', async () => {
  const fixture = await EvalFixture.create()
  try {
    assert.throws(
      () => fixture.build({ arm: 'with-without' }),
      /--arm must be none, block or baseline/)
  } finally {
    await fixture.close()
  }
})

test('fixture.sh copies the fixture from its own directory', async () => {
  const fixture = await EvalFixture.create()
  try {
    fixture.build()
    const script = fixture.read('t01-check-before-booking', 'fixture.sh')
    assert.match(script, /^#!\/usr\/bin\/env bash$/m)
    assert.match(
      script, /here="\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)" && pwd\)"/)
    assert.match(script, /cp -R "\$here\/fixture-tasks\/\." \./)
    assert.equal(script.includes(fixture.repository.root), false)
    assert.equal(
      fixture.exists('t01-check-before-booking', 'fixture-tasks/CONVENTIONS.md'),
      true)
  } finally {
    await fixture.close()
  }
})

test('--tag restraint selects only restraint cases', async () => {
  const fixture = await EvalFixture.create()
  try {
    const cases = fixture.build({ tag: 'restraint' })
    assert.deepEqual(
      cases.map(({ name }) => name), ['r01-overnight-duration'])
    assert.equal(fixture.exists('t01-check-before-booking'), false)
  } finally {
    await fixture.close()
  }
})

test('--only selects the case names given', async () => {
  const fixture = await EvalFixture.create()
  try {
    const cases = fixture.build({ only: ['t01-check-before-booking'] })
    assert.deepEqual(
      cases.map(({ name }) => name), ['t01-check-before-booking'])
  } finally {
    await fixture.close()
  }
})
