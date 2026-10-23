import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { PluginEvalRun } from '../../../scripts/lib/evals/plugin-eval-run.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class EvalRepositoryFixture {
  static QUESTION = 'q01-the-slot-rule-keeps-moving'

  static TASK = 't01-check-before-booking'

  static RESTRAINT = 'r01-overnight-duration'

  static BLOCK = [
    '## Object-oriented design skills',
    '',
    "- This project's own conventions win."
  ].join('\n')

  static TASK_YAML = [
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

  static RESTRAINT_YAML = [
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

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-eval-repository-'))
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
    await writeFile(join(skill, 'SKILL.md'), EvalRepositoryFixture.SKILL)
    await writeFile(
      join(skill, 'references', 'claude-md-block.md'),
      [
        '# CLAUDE.md block',
        '',
        '```markdown',
        ...EvalRepositoryFixture.BLOCK.split('\n'),
        '```',
        ''
      ].join('\n'))
    const evals = join(root, 'evals')
    await mkdir(join(evals, 'tasks'), { recursive: true })
    await mkdir(join(evals, 'fixture-tasks'), { recursive: true })
    await writeFile(
      join(evals, 'scenarios.md'), EvalRepositoryFixture.SCENARIOS)
    await writeFile(
      join(evals, 'tasks', `${EvalRepositoryFixture.TASK}.yaml`),
      EvalRepositoryFixture.TASK_YAML)
    await writeFile(
      join(evals, 'tasks', `${EvalRepositoryFixture.RESTRAINT}.yaml`),
      EvalRepositoryFixture.RESTRAINT_YAML)
    await writeFile(
      join(evals, 'fixture-tasks', 'CONVENTIONS.md'),
      '# Conventions\n')
    return new EvalRepositoryFixture(root)
  }

  #root

  constructor(root) {
    this.#root = root
  }

  get root() {
    return this.#root
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class CaseFixture {
  static question(name) {
    return { name, family: 'question', tags: ['question'] }
  }

  static task(name, family = 'task') {
    return { name, family, tags: [family] }
  }
}

class FakeClock {
  now() {
    return new Date('2026-10-23T10:00:00.000Z')
  }
}

class SampleResult {
  static read() {
    return JSON.parse(readFileSync(
      new URL('../../fixtures/aggregate-result.json', import.meta.url),
      'utf8'))
  }

  static withTrace(scaffold) {
    const result = SampleResult.read()
    result.cases[0].arms.with[0].tracePath =
      join(scaffold, 'out', 'trace.jsonl')
    return result
  }

  static withBaseline(scaffold) {
    const result = SampleResult.withTrace(scaffold)
    result.cases[0].arms.without = [
      structuredClone(result.cases[0].arms.with[0])
    ]
    return result
  }
}

class FakeRunner {
  #calls = []
  #result
  #exitCode

  constructor(result, { exitCode = 0 } = {}) {
    this.#result = result
    this.#exitCode = exitCode
  }

  run(command, args, cwd) {
    this.#calls.push({ command, args: [...args], cwd })
    if (command === 'git' && args[0] === 'rev-parse') {
      return { exitCode: 0, output: 'abc123\n' }
    }
    if (command === 'git' && args[0] === 'status') {
      return { exitCode: 0, output: '' }
    }
    const jsonAt = args.indexOf('--json')
    if (jsonAt === -1) throw new Error(`unexpected command ${command}`)
    const path = args[jsonAt + 1]
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, `${JSON.stringify(this.#result, null, 2)}\n`)
    return { exitCode: this.#exitCode, output: '' }
  }

  get calls() {
    return this.#calls
  }

  get claudeCalls() {
    return this.#calls.filter(({ command }) => command === 'claude')
  }
}

class Options {
  static block() {
    return Object.freeze({
      arm: 'block',
      model: 'claude-sonnet-5-5',
      judgeModel: 'claude-haiku-5-5',
      maxCostUsd: 2,
      runs: 1
    })
  }

  static baseline() {
    return Object.freeze({ ...Options.block(), arm: 'baseline' })
  }
}

class RunFixture {
  static async create({ result, options = Options.block(), cases = [
    CaseFixture.question(EvalRepositoryFixture.QUESTION)
  ], exitCode = 0 } = {}) {
    const repository = await EvalRepositoryFixture.create()
    return new RunFixture(repository, result, options, cases, exitCode)
  }

  #repository
  #runner
  #run
  #clock = new FakeClock()

  constructor(repository, result, options, cases, exitCode) {
    this.#repository = repository
    this.#runner = new FakeRunner(result, { exitCode })
    const [piece] = PluginEvalRun.pieces(cases)
    this.#run = new PluginEvalRun(
      Repository.at(repository.root),
      this.#runner,
      this.#clock,
      options,
      piece)
  }

  get run() {
    return this.#run
  }

  get runner() {
    return this.#runner
  }

  get root() {
    return this.#repository.root
  }

  async close() {
    await this.#repository.close()
  }
}

test('question cases and task cases never share a piece', () => {
  const pieces = PluginEvalRun.pieces([
    CaseFixture.question('q01-the-slot-rule-keeps-moving'),
    CaseFixture.question('q02-an-appointment-crosses-midnight'),
    CaseFixture.task('t01-check-before-booking'),
    CaseFixture.task('r01-overnight-duration', 'restraint')
  ])
  assert.deepEqual(
    pieces.map((piece) => ({
      name: piece.name,
      cases: piece.cases.map(({ name }) => name)
    })),
    [
      {
        name: 'questions',
        cases: [
          'q01-the-slot-rule-keeps-moving',
          'q02-an-appointment-crosses-midnight'
        ]
      },
      {
        name: 'tasks',
        cases: ['t01-check-before-booking', 'r01-overnight-duration']
      }
    ])
})

test('a piece holds at most six cases', () => {
  const cases = Array.from({ length: 8 }, (unused, index) =>
    CaseFixture.question(`q${String(index + 1).padStart(2, '0')}-case`))
  const pieces = PluginEvalRun.pieces(cases)
  assert.deepEqual(
    pieces.map((piece) => piece.cases.map(({ name }) => name)),
    [
      cases.slice(0, 6).map(({ name }) => name),
      cases.slice(6).map(({ name }) => name)
    ])
})

test('a block piece runs the exact command the issue pins', async () => {
  const fixture = await RunFixture.create({ result: SampleResult.read() })
  try {
    const copy = fixture.run.command()[2]
    assert.deepEqual(fixture.run.command().slice(3), [
      '--eval-dir', 'evals',
      '--trust-plugin', '--no-publish', '--scaffold', '--keep-temp',
      '--json', join(
        fixture.root,
        'evals/results/2026-10-23T10-00-00-000Z/questions/result.json'),
      '--output-dir', join(
        fixture.root,
        'evals/results/2026-10-23T10-00-00-000Z/questions'),
      '--model', 'claude-sonnet-5-5',
      '--judge-model', 'claude-haiku-5-5',
      '--max-cost-usd', '2',
      '--runs', '1',
      '--ablation', 'none'
    ])
    assert.equal(
      existsSync(join(copy, 'evals', EvalRepositoryFixture.QUESTION)), true)
    assert.equal(
      existsSync(join(copy, 'evals', EvalRepositoryFixture.TASK)), false)
  } finally {
    fixture.run.close()
    await fixture.close()
  }
})

test('a task piece grants Write and Edit', async () => {
  const fixture = await RunFixture.create({
    result: SampleResult.read(),
    cases: [
      CaseFixture.task(EvalRepositoryFixture.TASK),
      CaseFixture.task(EvalRepositoryFixture.RESTRAINT, 'restraint')
    ]
  })
  try {
    const command = fixture.run.command()
    const at = command.indexOf('--allow-tools')
    assert.notEqual(at, -1, 'the task command holds no --allow-tools')
    assert.deepEqual(
      command.slice(at, at + 3),
      ['--allow-tools', 'Write', 'Edit'])
  } finally {
    fixture.run.close()
    await fixture.close()
  }
})

test('a question piece grants no tool', async () => {
  const fixture = await RunFixture.create({ result: SampleResult.read() })
  try {
    assert.equal(
      fixture.run.command().includes('--allow-tools'),
      false,
      'the question command holds --allow-tools')
  } finally {
    fixture.run.close()
    await fixture.close()
  }
})

test('a baseline piece runs with-without and keeps its no-plugin runs',
  async () => {
    const scaffold = await mkdtemp(join(tmpdir(), 'e-'))
    await mkdir(join(scaffold, 'out'), { recursive: true })
    writeFileSync(
      join(scaffold, 'out', 'trace.jsonl'),
      '{"type":"assistant"}\n')
    const result = SampleResult.withBaseline(scaffold)
    const fixture = await RunFixture.create({
      result,
      options: Options.baseline()
    })
    try {
      const copy = fixture.run.command()[2]
      const caseYaml = readFileSync(
        join(copy, 'evals', EvalRepositoryFixture.QUESTION, 'case.yaml'))
      const hash = createHash('sha256')
        .update(caseYaml)
        .digest('hex')
        .slice(0, 12)
      assert.match(
        fixture.run.commandLine(),
        / --ablation with-without$/)
      fixture.run.execute(new Report())
      const baseline = await readFile(join(
        fixture.root,
        'evals/results/baselines/claude-sonnet-5-5',
        `${EvalRepositoryFixture.QUESTION}-${hash}.json`), 'utf8')
      assert.deepEqual(
        JSON.parse(baseline), result.cases[0].arms.without)
      const run = JSON.parse(await readFile(
        join(fixture.run.resultsPath, 'run.json'), 'utf8'))
      assert.equal(run.arm, 'baseline')
      assert.deepEqual(run.cases, [EvalRepositoryFixture.QUESTION])
    } finally {
      await rm(scaffold, { recursive: true, force: true })
      await fixture.close()
    }
  })

test('execute copies each trace and removes only its own scaffold',
  async () => {
    const scaffold = await mkdtemp(join(tmpdir(), 'e-'))
    const otherScaffold = await mkdtemp(join(tmpdir(), 'e-'))
    const decoy = await mkdtemp(join(tmpdir(), 'oo-decoy-'))
    await mkdir(join(scaffold, 'out'), { recursive: true })
    await mkdir(join(otherScaffold, 'out'), { recursive: true })
    writeFileSync(
      join(scaffold, 'out', 'trace.jsonl'),
      '{"type":"assistant"}\n')
    writeFileSync(
      join(otherScaffold, 'out', 'trace.jsonl'),
      '{"type":"assistant"}\n')
    writeFileSync(join(decoy, 'keep.txt'), 'keep\n')
    const fixture = await RunFixture.create({
      result: SampleResult.withTrace(scaffold)
    })
    try {
      fixture.run.execute(new Report())
      const target = join(
        fixture.run.resultsPath,
        'traces',
        EvalRepositoryFixture.QUESTION,
        'with-1.jsonl')
      assert.equal(
        await readFile(target, 'utf8'), '{"type":"assistant"}\n')
      assert.equal(existsSync(scaffold), false)
      assert.equal(existsSync(otherScaffold), true)
      assert.equal(existsSync(decoy), true)
    } finally {
      await rm(scaffold, { recursive: true, force: true })
      await rm(otherScaffold, { recursive: true, force: true })
      await rm(decoy, { recursive: true, force: true })
      await fixture.close()
    }
  })

test('run.json carries cost, both models, commit, dirtiness, arm and cases',
  async () => {
    const fixture = await RunFixture.create({ result: SampleResult.read() })
    try {
      fixture.run.execute(new Report())
      const run = JSON.parse(await readFile(
        join(fixture.run.resultsPath, 'run.json'), 'utf8'))
      assert.deepEqual(run, {
        costUsd: 0.06658909999999998,
        model: 'claude-sonnet-5-5',
        judgeModel: 'claude-haiku-5-5',
        commit: 'abc123',
        dirty: false,
        arm: 'block',
        cases: [EvalRepositoryFixture.QUESTION]
      })
    } finally {
      await fixture.close()
    }
  })

test('a failed case (exit 1) is a graded run', async () => {
  const fixture = await RunFixture.create({
    result: SampleResult.read(),
    exitCode: 1
  })
  try {
    fixture.run.execute(new Report())
    assert.equal(existsSync(join(fixture.run.resultsPath, 'run.json')), true)
  } finally {
    await fixture.close()
  }
})

test('exit 2 with a partial result is the cost ceiling', async () => {
  const result = SampleResult.read()
  result.partial = true
  result.partialReason = 'cost_ceiling'
  const fixture = await RunFixture.create({ result, exitCode: 2 })
  try {
    const report = new Report()
    fixture.run.execute(report)
    assert.ok(report.lines().includes('partial: cost_ceiling'))
    assert.equal(existsSync(join(fixture.run.resultsPath, 'run.json')), true)
  } finally {
    await fixture.close()
  }
})

test('exit 2 without a partial result is broken', async () => {
  const fixture = await RunFixture.create({
    result: SampleResult.read(),
    exitCode: 2
  })
  try {
    assert.throws(
      () => fixture.run.execute(new Report()),
      (error) => error instanceof RepoError && error.exitCode === 2)
  } finally {
    await fixture.close()
  }
})
