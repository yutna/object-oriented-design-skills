import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { RepoError } from '../errors.mjs'
import { QuotaReading } from './quota-reading.mjs'

export class QuotaMeter {
  static #ARGS = Object.freeze([
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

  #processRunner

  constructor(processRunner) {
    this.#processRunner = processRunner
    Object.freeze(this)
  }

  read() {
    // A fresh empty folder keeps the meter out of any project setup.
    const cwd = mkdtempSync(join(tmpdir(), 'oo-quota-meter-'))
    try {
      const { exitCode, output } = this.#processRunner.run(
        'claude',
        QuotaMeter.#ARGS,
        cwd)
      // A failed process has no reading to trust.
      if (exitCode !== 0) {
        throw new RepoError(
          `quota meter unreadable: exit ${exitCode}: ${output.trim()}`)
      }
      try {
        return QuotaReading.fromStreamJson(output)
      } catch (error) {
        if (error instanceof RepoError) {
          throw new RepoError(
            `quota meter unreadable: ${error.message}`)
        }
        throw error
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  }
}
