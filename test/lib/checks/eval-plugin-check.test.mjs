import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { EvalPluginCheck } from '../../../scripts/lib/checks/eval-plugin-check.mjs'
import { RepoError } from '../../../scripts/lib/errors.mjs'
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

  async readQueue() {
    return JSON.parse(await readFile(
      join(this.#root, 'evals', 'results', 'queue.json'), 'utf8'))
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

class FakeRunner {
  #calls = []

  run(command, args, cwd) {
    this.#calls.push({ command, args: [...args], cwd })
    throw new Error('this check path must not run a process')
  }

  get calls() {
    return this.#calls
  }
}

class FakeClock {
  now() {
    return new Date('2026-10-23T10:00:00.000Z')
  }
}

class Args {
  static valid(extra) {
    return [
      '--model', 'claude-sonnet-5-5',
      '--judge-model', 'claude-haiku-5-5',
      '--max-cost-usd', '2',
      ...extra
    ]
  }

  static without(flag) {
    const kept = []
    const argv = Args.valid([])
    for (let at = 0; at < argv.length; at += 2) {
      if (argv[at] !== flag) kept.push(argv[at], argv[at + 1])
    }
    return kept
  }
}

class TempCheck {
  static async create() {
    return new TempCheck(await EvalRepositoryFixture.create())
  }

  #fixture
  #runner = new FakeRunner()

  constructor(fixture) {
    this.#fixture = fixture
  }

  get fixture() {
    return this.#fixture
  }

  get runner() {
    return this.#runner
  }

  inspect(argv) {
    const report = new Report()
    new EvalPluginCheck(
      Repository.at(this.#fixture.root),
      argv,
      this.#runner,
      new FakeClock()).inspect(report)
    return report
  }

  async close() {
    await this.#fixture.close()
  }
}

class Required {
  static model() {
    return { flag: '--model', argv: Args.without('--model') }
  }

  static judgeModel() {
    return { flag: '--judge-model', argv: Args.without('--judge-model') }
  }

  static maxCostUsd() {
    return { flag: '--max-cost-usd', argv: Args.without('--max-cost-usd') }
  }
}

test('the script refuses to start without --model', async () => {
  const fixture = await TempCheck.create()
  try {
    const { flag, argv } = Required.model()
    assert.throws(
      () => fixture.inspect(['--dry-run', ...argv]),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message.includes(`${flag} is required`))
  } finally {
    await fixture.close()
  }
})

test('the script refuses to start without --judge-model', async () => {
  const fixture = await TempCheck.create()
  try {
    const { flag, argv } = Required.judgeModel()
    assert.throws(
      () => fixture.inspect(['--dry-run', ...argv]),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message.includes(`${flag} is required`))
  } finally {
    await fixture.close()
  }
})

test('the script refuses to start without --max-cost-usd', async () => {
  const fixture = await TempCheck.create()
  try {
    const { flag, argv } = Required.maxCostUsd()
    assert.throws(
      () => fixture.inspect(['--dry-run', ...argv]),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message.includes(`${flag} is required`))
  } finally {
    await fixture.close()
  }
})

test('--dry-run prints two pieces and their full commands', async () => {
  const fixture = await TempCheck.create()
  try {
    const report = fixture.inspect(['--dry-run', ...Args.valid([])])
    assert.equal(report.failed, false)
    const lines = report.lines()
    assert.ok(lines.includes('piece questions (1 case(s))'))
    assert.ok(lines.includes('piece tasks (2 case(s))'))
    const commands = lines.filter((line) => line.startsWith('command: '))
    assert.equal(commands.length, 2)
    for (const command of commands) {
      assert.match(command, /^command: claude plugin eval \S+ /)
      assert.match(command, / --eval-dir evals /)
      assert.match(command, / --trust-plugin --no-publish --scaffold --keep-temp /)
      assert.match(command, / --model claude-sonnet-5-5 /)
      assert.match(command, / --judge-model claude-haiku-5-5 /)
      assert.match(command, / --max-cost-usd 2 /)
      assert.match(command, / --runs 1 /)
      assert.match(command, / --ablation none$/)
    }
    assert.deepEqual(lines.slice(-1), ['ok 3 case(s) built'])
    assert.equal(fixture.runner.calls.length, 0)
  } finally {
    await fixture.close()
  }
})

test('each piece carries only its own cases in its copy', async () => {
  const fixture = await TempCheck.create()
  try {
    const lines = fixture.inspect(['--dry-run', ...Args.valid([])]).lines()
    const copies = lines
      .filter((line) => line.startsWith('piece '))
      .map((line, index) => ({
        name: line.slice('piece '.length, line.indexOf(' (')),
        copy: lines.filter((candidate) =>
          candidate.startsWith('command: '))[index].split(' ')[4]
      }))
    assert.deepEqual(copies.map(({ name }) => name), ['questions', 'tasks'])
    const questions = copies[0].copy
    assert.equal(
      existsSync(`${questions}/evals/${EvalRepositoryFixture.QUESTION}`), true)
    assert.equal(
      existsSync(`${questions}/evals/${EvalRepositoryFixture.TASK}`), false)
    assert.equal(
      existsSync(`${questions}/evals/${EvalRepositoryFixture.RESTRAINT}`),
      false)
    const tasks = copies[1].copy
    assert.equal(
      existsSync(`${tasks}/evals/${EvalRepositoryFixture.QUESTION}`), false)
    assert.equal(
      existsSync(`${tasks}/evals/${EvalRepositoryFixture.TASK}`), true)
    assert.equal(
      existsSync(`${tasks}/evals/${EvalRepositoryFixture.RESTRAINT}`), true)
    await Promise.all(copies.map(({ copy }) =>
      rm(copy, { recursive: true, force: true })))
  } finally {
    await fixture.close()
  }
})

test('--queue adds one piece, a pause after it, then the next piece',
  async () => {
    const fixture = await TempCheck.create()
    try {
      const report = fixture.inspect(['--queue', ...Args.valid([])])
      assert.deepEqual(report.lines(), [
        'queued: questions (1 case(s))',
        'queued: tasks (2 case(s))',
        'ok 2 piece(s) queued'
      ])
      const queue = await fixture.fixture.readQueue()
      assert.equal(queue.length, 3)
      assert.deepEqual(queue[0], {
        id: 'eval-1792749600000-questions',
        label: 'plugin-eval questions',
        script: 'scripts/eval-plugin.mjs',
        args: [
          '--only', EvalRepositoryFixture.QUESTION,
          '--arm', 'block',
          '--model', 'claude-sonnet-5-5',
          '--judge-model', 'claude-haiku-5-5',
          '--max-cost-usd', '2',
          '--runs', '1'
        ]
      })
      assert.deepEqual(queue[1], {
        pause: 'read the traces of piece 1 before more runs'
      })
      assert.equal(queue[2].label, 'plugin-eval tasks')
      assert.deepEqual(queue[2].args.slice(0, 2), [
        '--only',
        `${EvalRepositoryFixture.RESTRAINT},${EvalRepositoryFixture.TASK}`
      ])
      assert.equal(fixture.runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--queue and --dry-run cannot be combined', async () => {
  const fixture = await TempCheck.create()
  try {
    assert.throws(
      () => fixture.inspect(['--queue', '--dry-run', ...Args.valid([])]),
      (error) => error instanceof RepoError &&
        /cannot be combined/.test(error.message))
  } finally {
    await fixture.close()
  }
})

test('a run outside the queue is refused', async () => {
  const fixture = await TempCheck.create()
  const previous = process.env.OO_EVAL_QUEUE
  try {
    delete process.env.OO_EVAL_QUEUE
    assert.throws(
      () => fixture.inspect(Args.valid([])),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        /OO_EVAL_QUEUE=1/.test(error.message))
    assert.equal(fixture.runner.calls.length, 0)
  } finally {
    if (previous === undefined) delete process.env.OO_EVAL_QUEUE
    else process.env.OO_EVAL_QUEUE = previous
    await fixture.close()
  }
})

test('--max-cost-usd must be a number above 0', async () => {
  const fixture = await TempCheck.create()
  try {
    assert.throws(
      () => fixture.inspect([
        '--dry-run',
        '--model', 'claude-sonnet-5-5',
        '--judge-model', 'claude-haiku-5-5',
        '--max-cost-usd', '0'
      ]),
      (error) => error instanceof RepoError &&
        /above 0/.test(error.message))
  } finally {
    await fixture.close()
  }
})
