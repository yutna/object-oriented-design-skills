import { resolve } from 'node:path'

import { Check } from '../check.mjs'
import { RepositoryCopy } from './repository-copy.mjs'

export class NegativeSuite extends Check {
  #root
  #cases
  #runner

  constructor(root, cases, runner) {
    super()
    this.#root = resolve(root)
    this.#cases = Object.freeze([...cases])
    this.#runner = runner
    Object.freeze(this)
  }

  get name() {
    return 'negative'
  }

  inspect(report) {
    if (!this.#control(report)) {
      report.count('case(s)', 0)
      return
    }
    for (const testCase of this.#cases) {
      this.#inspectCase(testCase, report)
    }
    report.count('case(s)', this.#cases.length)
  }

  #control(report) {
    const scripts = [...new Set(this.#cases.map((testCase) =>
      testCase.script))]
    const copy = RepositoryCopy.of(this.#root)
    let failures = 0
    try {
      for (const script of scripts) {
        const { exitCode, output } = this.#runner.run(
          process.execPath,
          [script],
          copy.root)
        if (exitCode !== 0) {
          failures += 1
          report.error(
            script,
            `control exited ${exitCode}: ${output.trim()}`)
        }
      }
    } finally {
      copy.dispose()
    }
    return failures === 0
  }

  #inspectCase(testCase, report) {
    const copy = RepositoryCopy.of(this.#root)
    try {
      testCase.mutation.apply(copy.root)
      const { exitCode, output } = this.#runner.run(
        process.execPath,
        [testCase.script],
        copy.root)
      if (exitCode === 1 && output.includes(testCase.expected)) {
        report.note(`ok ${testCase.label}`)
        return
      }
      report.error(
        testCase.label,
        `expected exit 1 and ${JSON.stringify(testCase.expected)}, ` +
        `got exit ${exitCode}: ${output.trim()}`)
    } finally {
      copy.dispose()
    }
  }
}
