import { RepoError } from './errors.mjs'
import { Report } from './report.mjs'

export class Cli {
  #process

  constructor(processLike) {
    this.#process = processLike
  }

  async run(check) {
    const report = new Report()
    try {
      await check.run(report)
      this.#process.stdout.write(`${report.lines().join('\n')}\n`)
      this.#process.exitCode = report.failed ? 1 : 0
    } catch (error) {
      if (error instanceof RepoError) {
        this.#process.stderr.write(`error: ${error.message}\n`)
        this.#process.exitCode = 1
        return
      }
      const stack = error instanceof Error ? error.stack : String(error)
      this.#process.stderr.write(`${stack}\n`)
      this.#process.exitCode = 2
    }
  }
}
