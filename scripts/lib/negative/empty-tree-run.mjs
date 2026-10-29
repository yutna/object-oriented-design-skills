import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Check } from '../check.mjs'

export class EmptyTreeRun extends Check {
  static SCRIPTS = Object.freeze([
    'scripts/validate-oop.mjs',
    'scripts/validate-skills.mjs',
    'scripts/validate-rules.mjs',
    'scripts/validate-prose.mjs',
    'scripts/validate-patterns.mjs',
    'scripts/validate-counts.mjs',
    'scripts/eval-routing.mjs'
  ])

  #root
  #runner

  constructor(root, runner) {
    super()
    this.#root = resolve(root)
    this.#runner = runner
    Object.freeze(this)
  }

  get name() {
    return 'empty-tree'
  }

  inspect(report) {
    for (const script of EmptyTreeRun.SCRIPTS) {
      this.#inspectScript(script, report)
    }
    report.count('script(s)', EmptyTreeRun.SCRIPTS.length)
  }

  #inspectScript(script, report) {
    const directory = mkdtempSync(join(tmpdir(), 'oo-empty-'))
    try {
      const { exitCode, output } = this.#runner.run(
        process.execPath,
        [join(this.#root, script)],
        directory)
      if (exitCode === 1 &&
        (output.includes('error:') ||
          output.includes('measured nothing'))) {
        report.note(`ok ${script} refuses an empty tree`)
        return
      }
      report.error(
        script,
        'expected exit 1 and "error:" or "measured nothing", ' +
        `got exit ${exitCode}: ${output.trim()}`)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }
}
