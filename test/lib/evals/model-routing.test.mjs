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
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            name: 'Skill',
            input: { skill }
          }]
        }
      }),
      RouteStream.#result(answer)
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

  static #result(answer) {
    return JSON.stringify({
      type: 'result',
      subtype: 'success',
      result: answer
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
    environment = { OO_EVAL_QUEUE: '1' }
  } = {}) {
    const report = new Report()
    new ModelRouting(
      this.repository,
      argv,
      runner,
      environment).inspect(report)
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
        'top-1: 1/2',
        'miss: which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities, answered oo-design',
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
        'top-1: 1/2',
        'miss: we are sizing this appointment design work ' +
          '-> expected oo-design, answered oo-assigning-responsibilities',
        'ok 2 routed case(s)'
      ])
      const [directory] = fixture.results()
      const answers = await fixture.answers(directory)
      assert.equal(answers.results.length, 2)
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

test('ModelRouting answers none when no Skill call or skill name appears',
  async () => {
    const fixture = await TempRepository.of()
    try {
      const runner = new FakeRunner(RouteStream.text('none'))
      const report = fixture.inspect({ runner })
      assert.equal(report.failed, false)
      assert.deepEqual(report.lines(), [
        'top-1: 0/2',
        'miss: we are sizing this appointment design work ' +
          '-> expected oo-design, answered none',
        'miss: which class owns the appointment reminder ' +
          '-> expected oo-assigning-responsibilities, answered none',
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
      argv: ['--dry-run'],
      runner,
      environment: {}
    })
    assert.equal(runner.calls.length, 0)
    assert.equal(report.failed, false)
    const lines = report.lines()
    assert.equal(lines.length, 3)
    assert.match(
      lines[0],
      /^claude -p --model claude-haiku-5-5 --setting-sources "" /)
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
    assert.match(lines[1], /^claude .*which class owns/)
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
    assert.equal(report.lines()[0], 'top-1: 1/2')
    assert.equal(report.lines().at(-1), 'ok 2 routed case(s)')
    assert.equal(runner.calls, 2)
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
