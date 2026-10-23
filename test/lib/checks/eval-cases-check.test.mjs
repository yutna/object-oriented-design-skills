import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { EvalCasesCheck } from '../../../scripts/lib/checks/eval-cases-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

class FakeSkill {
  #name

  constructor(name) {
    this.#name = name
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }
}

class FakeRepository {
  #root

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get root() {
    return this.#root
  }

  file(path) {
    return TextFile.read(join(this.#root, path))
  }

  skills() {
    return [
      new FakeSkill('oo-design'),
      new FakeSkill('oo-assigning-responsibilities')
    ]
  }
}

class CaseYaml {
  static passing(name = 't01-check-before-booking') {
    return [
      'schema_version: "1.1"',
      `name: ${name}`,
      'description: A clinic task.',
      'tags: [task, smoke]',
      'context:',
      '  scaffold_script: fixture.sh',
      'execution:',
      '  prompt: |',
      '    A clinic task.',
      '  allowed_tools: [Read, Skill, Edit]',
      'graders:',
      '  - name: loaded-assigning-responsibilities',
      '    type: tool_used',
      '    tool: Skill',
      '    input_match: \'"skill"\\s*:\\s*"(?:[\\w-]+:)?' +
        'oo-assigning-responsibilities"\'',
      '  - name: handler-answers',
      '    type: tool_used',
      '    tool: Read',
      '    arm: with-only',
      ''
    ].join('\n')
  }
}

class TempCase {
  static async of(text, fileName = 't01-check-before-booking.yaml') {
    const root = await mkdtemp(join(tmpdir(), 'oo-eval-cases-'))
    const directory = join(root, 'evals', 'tasks')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, fileName), text)
    return new TempCase(root, new FakeRepository(root))
  }

  #root
  #repository

  constructor(root, repository) {
    this.#root = root
    this.#repository = repository
    Object.freeze(this)
  }

  inspect() {
    const report = new Report()
    new EvalCasesCheck(this.#repository).inspect(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class CheckRun {
  static async report(text) {
    const fixture = await TempCase.of(text)
    try {
      return fixture.inspect()
    } finally {
      await fixture.close()
    }
  }
}

const FILE = 'evals/tasks/t01-check-before-booking.yaml'

test('eval cases reject a schema_version other than 1.1', async () => {
  const report = await CheckRun.report(CaseYaml.passing()
    .replace('schema_version: "1.1"', 'schema_version: "1.0"'))
  assert.deepEqual(report.lines(), [
    `error ${FILE}: schema_version must be "1.1"`,
    'failed: 1 error(s)'
  ])
})

test('eval cases reject a name that differs from the file name', async () => {
  const report = await CheckRun.report(CaseYaml.passing('other-case'))
  assert.deepEqual(report.lines(), [
    `error ${FILE}: name must equal the file name without .yaml`,
    'failed: 1 error(s)'
  ])
})

test('eval cases reject tags without one family tag', async () => {
  const report = await CheckRun.report(CaseYaml.passing()
    .replace('tags: [task, smoke]', 'tags: [smoke]'))
  assert.deepEqual(report.lines(), [
    `error ${FILE}: tags must hold exactly one family tag of ` +
      'task, restraint or precedence',
    'failed: 1 error(s)'
  ])
})

test('eval cases reject a scaffold the runner does not supply', async () => {
  const report = await CheckRun.report(CaseYaml.passing()
    .replace('scaffold_script: fixture.sh',
      'scaffold_script: other.sh'))
  assert.deepEqual(report.lines(), [
    `error ${FILE}: context.scaffold_script must be fixture.sh`,
    'failed: 1 error(s)'
  ])
})

test('eval cases reject allowed tools without Skill', async () => {
  const report = await CheckRun.report(CaseYaml.passing()
    .replace('allowed_tools: [Read, Skill, Edit]',
      'allowed_tools: [Read, Edit]'))
  assert.deepEqual(report.lines(), [
    `error ${FILE}: execution.allowed_tools must include Skill`,
    'failed: 1 error(s)'
  ])
})

test('eval cases reject a Skill grader without the loaded- prefix',
  async () => {
    const report = await CheckRun.report(CaseYaml.passing()
      .replace('name: loaded-assigning-responsibilities',
        'name: assigning-responsibilities'))
    assert.deepEqual(report.lines(), [
      `error ${FILE}: Skill grader assigning-responsibilities must ` +
        'have a name starting loaded-',
      'failed: 1 error(s)'
    ])
  })

test('eval cases reject an input_match naming an unknown skill',
  async () => {
    const report = await CheckRun.report(CaseYaml.passing()
      .replace('oo-assigning-responsibilities"\'',
        'oo-no-such-skill"\''))
    assert.deepEqual(report.lines(), [
      `error ${FILE}: unknown skill in input_match: oo-no-such-skill`,
      'failed: 1 error(s)'
    ])
  })

test('eval cases reject a Read grader without the with-only arm',
  async () => {
    const report = await CheckRun.report(CaseYaml.passing()
      .replace('arm: with-only', 'arm: without-only'))
    assert.deepEqual(report.lines(), [
      `error ${FILE}: Read grader handler-answers must set ` +
        'arm: with-only',
      'failed: 1 error(s)'
    ])
  })

test('a passing eval case counts its task case', async () => {
  const report = await CheckRun.report(CaseYaml.passing())
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), ['ok 1 task case(s)'])
})
