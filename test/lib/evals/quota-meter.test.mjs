import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { RepoError } from '../../../scripts/lib/errors.mjs'
import { QuotaMeter } from '../../../scripts/lib/evals/quota-meter.mjs'

class Fixture {
  static stream() {
    return readFileSync(
      new URL('../../fixtures/rate-limit-event.jsonl', import.meta.url),
      'utf8')
  }
}

class FakeRunner {
  #calls = []
  #result

  constructor(result) {
    this.#result = result
  }

  run(command, args, cwd) {
    this.#calls.push({
      command,
      args: [...args],
      cwd,
      cwdExists: existsSync(cwd)
    })
    return this.#result
  }

  get calls() {
    return this.#calls
  }
}

test('QuotaMeter runs the pinned command in a fresh folder', () => {
  const runner = new FakeRunner({
    exitCode: 0,
    output: Fixture.stream()
  })
  const reading = new QuotaMeter(runner).read()
  assert.equal(runner.calls.length, 1)
  const [call] = runner.calls
  assert.equal(call.command, 'claude')
  assert.deepEqual(call.args.slice(5, 8), [
    '--setting-sources',
    '',
    '--strict-mcp-config'
  ])
  assert.deepEqual(call.args, [
    '-p',
    '--model',
    'claude-haiku-5-5',
    '--tools',
    '',
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--system-prompt',
    'Reply with one word.',
    '--output-format',
    'stream-json',
    '--verbose',
    'ping'
  ])
  assert.equal(call.cwdExists, true)
  assert.equal(call.cwd.startsWith(tmpdir()), true)
  assert.equal(existsSync(call.cwd), false)
  assert.equal(reading.fiveHour, 3)
  assert.equal(reading.sevenDay, 48)
})

test('QuotaMeter reports a non-zero exit as unreadable', () => {
  const meter = new QuotaMeter(new FakeRunner({
    exitCode: 2,
    output: 'no meter\n'
  }))
  assert.throws(
    () => meter.read(),
    (error) => error instanceof RepoError &&
      error.message === 'quota meter unreadable: exit 2: no meter')
})

test('QuotaMeter reports a missing event as unreadable', () => {
  const meter = new QuotaMeter(new FakeRunner({
    exitCode: 0,
    output: '{"type":"result"}\n'
  }))
  assert.throws(
    () => meter.read(),
    (error) => error instanceof RepoError &&
      /^quota meter unreadable: .*no rate_limit_event/.test(error.message))
})
