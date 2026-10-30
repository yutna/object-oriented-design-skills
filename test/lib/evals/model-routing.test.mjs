import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { ModelRouting } from '../../../scripts/lib/evals/model-routing.mjs'
import { SelftestRunner } from '../../../scripts/lib/evals/selftest-runner.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class Skills {
  static ALL = Object.freeze([
    'oo-assigning-responsibilities',
    'oo-design'
  ])
}

class Fixtures {
  static route() {
    return readFileSync(
      new URL('../../fixtures/route-model-stream.jsonl', import.meta.url),
      'utf8')
  }
}

class RouteStream {
  static text(answer, skills = Skills.ALL) {
    return `${[
      RouteStream.#listed(skills),
      RouteStream.#result(answer)
    ].join('\n')}\n`
  }

  static skill(skill, answer, skills = Skills.ALL) {
    return `${[
      RouteStream.#listed(skills),
      RouteStream.#skillCall(skill),
      RouteStream.#result(answer)
    ].join('\n')}\n`
  }

  static maxTurns(skill, skills = Skills.ALL) {
    return `${[
      RouteStream.#listed(skills),
      RouteStream.#skillCall(skill),
      RouteStream.#limited()
    ].join('\n')}\n`
  }

  static limited(skills = Skills.ALL) {
    return `${[
      RouteStream.#listed(skills),
      RouteStream.#limited()
    ].join('\n')}\n`
  }

  static #listed(skills) {
    return JSON.stringify({
      type: 'system',
      subtype: 'init',
      model: 'claude-haiku-5-5',
      skills: skills.map((skill) =>
        `object-oriented-design-skills:${skill}`)
    })
  }

  static #skillCall(skill) {
    return JSON.stringify({
      type: 'assistant',
      message: {
        content: [{
          type: 'tool_use',
          name: 'Skill',
          input: { skill }
        }]
      }
    })
  }

  static #result(answer) {
    return JSON.stringify({
      type: 'result',
      subtype: 'success',
      result: answer
    })
  }

  static #limited() {
    return JSON.stringify({
      type: 'result',
      subtype: 'error_max_turns',
      is_error: true,
      stop_reason: 'tool_use',
      result: 'Reached the maximum number of turns'
    })
  }
}

class FakeRunner {
  #calls = []
  #exitCode
  #output

  constructor(output, exitCode = 0) {
    this.#output = output
    this.#exitCode = exitCode
  }

  run(command, args, cwd) {
    this.#calls.push({ command, args: [...args], cwd })
    return { exitCode: this.#exitCode, output: this.#output }
  }

  get calls() {
    return this.#calls
  }
}

class FakeGit {
  static COMMIT = 'abc123'

  run(command, args, cwd) {
    if (command !== 'git' || args[0] !== 'rev-parse') {
      throw new Error(`unexpected git command ${command}`)
    }
    return { exitCode: 0, output: `${FakeGit.COMMIT}\n` }
  }
}

class SequenceRunner {
  #outputs
  #calls = []

  constructor(outputs) {
    this.#outputs = [...outputs]
  }

  run(command, args, cwd) {
    this.#calls.push({ command, args: [...args], cwd })
    if (this.#outputs.length === 0) {
      throw new Error('no scripted output left')
    }
    return { exitCode: 0, output: this.#outputs.shift() }
  }

  get calls() {
    return this.#calls
  }
}

class TempRepository {
  static #CASES = Object.freeze([
    'we are sizing this appointment design work -> oo-design',
    'which class owns the appointment reminder ' +
      '-> oo-assigning-responsibilities'
  ])

  static async of({ cases = TempRepository.#CASES, skills = Skills.ALL } = {}) {
    const root = await mkdtemp(join(tmpdir(), 'oo-model-routing-'))
    const plugin = join(root, 'plugins', 'core')
    await mkdir(join(plugin, '.claude-plugin'), { recursive: true })
    await writeFile(
      join(plugin, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify({
        name: 'object-oriented-design-skills',
        version: '0.5.0'
      })}\n`)
    for (const skill of skills) {
      await TempRepository.#writeSkill(plugin, skill)
    }
    await mkdir(join(root, 'evals'), { recursive: true })
    await writeFile(
      join(root, 'evals', 'routing-cases.md'),
      [
        '# Routing Cases',
        '',
        '```text',
        ...cases,
        '```',
        ''
      ].join('\n'))
    return new TempRepository(root)
  }

  static async #writeSkill(plugin, skill) {
    const directory = join(plugin, 'skills', skill)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      `name: ${skill}`,
      'description: Use when a clinic design needs work.',
      'license: MIT',
      'metadata:',
      '  version: 0.5.0',
      '  pack: object-oriented-design-skills',
      '---',
      '',
      `# ${skill}`,
      ''
    ].join('\n'))
  }

  #root

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get root() {
    return this.#root
  }

  get repository() {
    return Repository.at(this.#root)
  }

  inspect({
    argv = [],
    runner,
    git = new FakeGit(),
    environment = { OO_EVAL_QUEUE: '1' }
  } = {}) {
    const report = new Report()
    new ModelRouting(
      this.repository,
      argv,
      runner,
      environment,
      git).inspect(report)
    return report
  }

  results() {
    const directory = join(this.#root, 'evals', 'results')
    if (!existsSync(directory)) return []
    return readdirSync(directory)
      .filter((name) => name.endsWith('-route'))
      .sort()
  }

  async answers(directory) {
    return JSON.parse(await readFile(
      join(this.#root, 'evals', 'results', directory, 'answers.json'),
      'utf8'))
  }

  async raw(directory, stream) {
    return readFile(
      join(this.#root, 'evals', 'results', directory, stream),
      'utf8')
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('ModelRouting takes the first Skill call and strips its prefix',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.skill(
        'object-oriented-design-skills:oo-design',
        'object-oriented-design-skills:oo-assigning-responsibilities'))
      const report = fixture.inspect({ runner })
      assert.deepEqual(report.lines(), [
        'hits: 3/6',
        '0/3 which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities; ' +
          'answered oo-design, oo-design, oo-design',
        'ok 2 routed case(s)'
      ])
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting keeps a max-turns run whose answer is a Skill call',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.maxTurns(
        'object-oriented-design-skills:oo-design'), 1)
      const report = fixture.inspect({ runner })
      assert.deepEqual(report.lines(), [
        'hits: 3/6',
        '0/3 which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities; ' +
          'answered oo-design, oo-design, oo-design',
        'ok 2 routed case(s)'
      ])
      const [directory] = fixture.results()
      const answers = await fixture.answers(directory)
      assert.deepEqual(
        answers.results.map(({ answer }) => answer),
        [
          'oo-design',
          'oo-design',
          'oo-design',
          'oo-design',
          'oo-design',
          'oo-design'
        ])
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting throws when a non-zero exit ends after a Skill answer',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.skill(
        'object-oriented-design-skills:oo-design',
        'object-oriented-design-skills:oo-design'), 1)
      assert.throws(
        () => fixture.inspect({ runner }),
        (error) => error instanceof RepoError &&
          error.exitCode === 1 &&
          error.message.startsWith('route run failed: exit 1: '))
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting counts the turn limit with no Skill call as none',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.limited(), 1)
      const report = fixture.inspect({ runner })
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'hits: 0/6',
        '0/3 we are sizing this appointment design work ' +
          '-> expected oo-design; answered none, none, none',
        '0/3 which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities; answered none, none, none',
        'ok 2 routed case(s)'
      ])
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting reads the real text answer and strips its prefix',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(Fixtures.route())
      const report = fixture.inspect({ runner })
      assert.deepEqual(report.lines(), [
        'hits: 3/6',
        '0/3 we are sizing this appointment design work ' +
          '-> expected oo-design; ' +
          'answered oo-assigning-responsibilities, ' +
          'oo-assigning-responsibilities, oo-assigning-responsibilities',
        'ok 2 routed case(s)'
      ])
      const [directory] = fixture.results()
      const answers = await fixture.answers(directory)
      assert.equal(answers.model, 'claude-haiku-5-5')
      assert.equal(answers.commit, FakeGit.COMMIT)
      assert.equal(answers.runs, 3)
      assert.equal(answers.results.length, 6)
      assert.equal(
        answers.results[0].answer,
        'oo-assigning-responsibilities')
      assert.equal(
        await fixture.raw(directory, answers.results[0].stream),
        Fixtures.route())
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting counts a skill named without its oo- prefix',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.text(
        'assigning-responsibilities'))
      const report = fixture.inspect({ argv: ['--runs', '1'], runner })
      assert.deepEqual(report.lines(), [
        'hits: 1/2',
        '0/1 we are sizing this appointment design work ' +
          '-> expected oo-design; ' +
          'answered oo-assigning-responsibilities',
        'ok 2 routed case(s)'
      ])
      const [directory] = fixture.results()
      const answers = await fixture.answers(directory)
      assert.deepEqual(
        answers.results.map(({ answer }) => answer),
        ['oo-assigning-responsibilities', 'oo-assigning-responsibilities'])
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting keeps an answer that names no skill a miss',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.text('scheduling'))
      const report = fixture.inspect({ argv: ['--runs', '1'], runner })
      assert.deepEqual(report.lines(), [
        'hits: 0/2',
        '0/1 we are sizing this appointment design work ' +
          '-> expected oo-design; answered scheduling',
        '0/1 which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities; answered scheduling',
        'ok 2 routed case(s)'
      ])
      const [directory] = fixture.results()
      const answers = await fixture.answers(directory)
      assert.deepEqual(
        answers.results.map(({ answer }) => answer),
        ['scheduling', 'scheduling'])
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting answers none when no Skill call or skill name appears',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.text('none'))
      const report = fixture.inspect({ runner })
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'hits: 0/6',
        '0/3 we are sizing this appointment design work ' +
          '-> expected oo-design; answered none, none, none',
        '0/3 which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities; answered none, none, none',
        'ok 2 routed case(s)'
      ])
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting is broken when the listing misses a copied skill',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.text(
        'none',
        [Skills.ALL[0]]))
      assert.throws(
        () => fixture.inspect({ runner }),
        (error) => error instanceof RepoError &&
          error.message.includes(
            'object-oriented-design-skills:oo-design'))
    } finally {
      await fixture.close()
    }
  })

test('ModelRouting refuses to run without the queue variable', async () => {
  const fixture = await TempRepository.of()
  try {
    const runner = new FakeRunner(Fixtures.route())
    const report = new Report()
    assert.throws(
      () => new ModelRouting(
        fixture.repository,
        [],
        runner,
        {}).inspect(report),
      (error) => error instanceof RepoError &&
        error.exitCode === 2 &&
        error.message === 'run it through scripts/eval-queue.mjs')
    assert.equal(runner.calls.length, 0)
  } finally {
    await fixture.close()
  }
})

test('--dry-run prints one command per case and calls nothing', async () => {
  const fixture = await TempRepository.of()
  try {
    const runner = new FakeRunner('must not run')
    const report = fixture.inspect({
      argv: ['--dry-run', '--runs', '2'],
      runner,
      environment: {}
    })
    assert.equal(runner.calls.length, 0)
    assert.equal(report.failed, false)
    const lines = report.lines()
    assert.equal(lines.length, 5)
    assert.match(
      lines[0],
      /^claude -p --model claude-haiku-5-5 --setting-sources "" /)
    assert.match(
      lines[0],
      / --setting-sources "" --strict-mcp-config /)
    assert.match(
      lines[0],
      / --plugin-dir \S+ --tools Skill --max-turns 1 /)
    assert.match(
      lines[0],
      / --output-format stream-json --verbose "we are sizing this /)
    assert.match(
      lines[0],
      /appointment design work\\n\\nWhich of your skills fits this /)
    assert.match(
      lines[0],
      /request best\? Reply with its name only, or none\."$/)
    assert.equal(lines[1], lines[0])
    assert.match(lines[2], /^claude .*which class owns/)
    assert.equal(lines[3], lines[2])
    assert.equal(lines.at(-1), 'ok 2 routed case(s)')
    assert.deepEqual(fixture.results(), [])
  } finally {
    await fixture.close()
  }
})

test('--selftest runs every case against a fake runner', async () => {
  const fixture = await TempRepository.of()
  try {
    const runner = new SelftestRunner()
    const report = fixture.inspect({
      argv: ['--selftest'],
      runner,
      environment: {}
    })
    assert.equal(report.failed, false)
    assert.equal(report.lines()[0], 'hits: 3/6')
    assert.equal(report.lines().at(-1), 'ok 2 routed case(s)')
    assert.equal(runner.calls, 6)
  } finally {
    await fixture.close()
  }
})

test('--case keeps only the routing cases whose symptom contains it',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner('must not run')
      const report = fixture.inspect({
        argv: ['--dry-run', '--case', 'appointment reminder', '--runs', '2'],
        runner,
        environment: {}
      })
      assert.equal(runner.calls.length, 0)
      assert.equal(report.failed, false)
      const lines = report.lines()
      assert.equal(lines.length, 3)
      assert.match(lines[0], /which class owns the appointment reminder/)
      assert.equal(lines[1], lines[0])
      assert.equal(lines.at(-1), 'ok 1 routed case(s)')
      assert.deepEqual(fixture.results(), [])
    } finally {
      await fixture.close()
    }
  })

test('--case with --runs repeats only the matching case', async () => {
  const fixture = await TempRepository.of()
  try {
    const runner = new FakeRunner(RouteStream.text(
      'object-oriented-design-skills:oo-design'))
    const report = fixture.inspect({
      argv: ['--case', 'sizing this appointment', '--runs', '2'],
      runner
    })
    assert.equal(runner.calls.length, 2)
    assert.deepEqual(report.lines(), [
      'hits: 2/2',
      'ok 1 routed case(s)'
    ])
    for (const { args } of runner.calls) {
      assert.match(args.at(-1), /^we are sizing this appointment/)
    }
    const [directory] = fixture.results()
    const answers = await fixture.answers(directory)
    assert.equal(answers.runs, 2)
    assert.equal(answers.cases, 1)
    assert.deepEqual(
      answers.results.map(({ symptom }) => symptom),
      [
        'we are sizing this appointment design work',
        'we are sizing this appointment design work'
      ])
  } finally {
    await fixture.close()
  }
})

test('--case that matches no routing case fails as a measurement',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner('must not run')
      assert.throws(
        () => fixture.inspect({
          argv: ['--dry-run', '--case', 'no such case'],
          runner,
          environment: {}
        }),
        (error) => error instanceof RepoError &&
          error.exitCode === 1 &&
          error.message ===
            '--case "no such case" matches no routing case')
      assert.equal(runner.calls.length, 0)
    } finally {
      await fixture.close()
    }
  })

test('--selftest honours --case', async () => {
  const fixture = await TempRepository.of()
  try {
    const runner = new SelftestRunner()
    const report = fixture.inspect({
      argv: ['--selftest', '--case', 'appointment reminder'],
      runner,
      environment: {}
    })
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), [
      'hits: 3/3',
      'ok 1 routed case(s)'
    ])
    assert.equal(runner.calls, 3)
  } finally {
    await fixture.close()
  }
})

test('ModelRouting counts hits per case across three runs', async () => {
  const fixture = await TempRepository.of({
    cases: ['we are sizing this appointment design work -> oo-design']
  })
  try {
    const runner = new SequenceRunner([
      RouteStream.text('object-oriented-design-skills:oo-design'),
      RouteStream.text('object-oriented-design-skills:oo-design'),
      RouteStream.text('update-config')
    ])
    const report = fixture.inspect({ argv: ['--runs', '3'], runner })
    assert.deepEqual(report.lines(), [
      'hits: 2/3',
      '2/3 we are sizing this appointment design work ' +
        '-> expected oo-design; answered oo-design, oo-design, update-config',
      'ok 1 routed case(s)'
    ])
    const [directory] = fixture.results()
    const answers = await fixture.answers(directory)
    assert.equal(answers.model, 'claude-haiku-5-5')
    assert.equal(answers.commit, FakeGit.COMMIT)
    assert.equal(answers.runs, 3)
    assert.deepEqual(
      answers.results.map(({ answer }) => answer),
      ['oo-design', 'oo-design', 'update-config'])
  } finally {
    await fixture.close()
  }
})

test('ModelRouting keeps a built-in skill answer verbatim', async () => {
  const fixture = await TempRepository.of()
  try {
    const runner = new FakeRunner(RouteStream.text(
      '  object-oriented-design-skills:update-config  '))
    const report = fixture.inspect({ argv: ['--runs', '1'], runner })
    assert.deepEqual(report.lines(), [
      'hits: 0/2',
      '0/1 we are sizing this appointment design work ' +
        '-> expected oo-design; answered update-config',
      '0/1 which class owns the appointment reminder ' +
        '-> expected oo-assigning-responsibilities; answered update-config',
      'ok 2 routed case(s)'
    ])
    const [directory] = fixture.results()
    const answers = await fixture.answers(directory)
    assert.deepEqual(
      answers.results.map(({ answer }) => answer),
      ['update-config', 'update-config'])
  } finally {
    await fixture.close()
  }
})

test('the entry exits 2 without the queue variable', () => {
  const environment = { ...process.env }
  delete environment.OO_EVAL_QUEUE
  const child = spawnSync(
    process.execPath,
    [join('scripts', 'eval-route-model.mjs')],
    {
      cwd: process.cwd(),
      env: environment,
      encoding: 'utf8'
    })
  assert.equal(child.status, 2)
  assert.equal(
    child.stderr,
    'error: run it through scripts/eval-queue.mjs\n')
})
