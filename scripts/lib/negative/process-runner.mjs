import { spawnSync } from 'node:child_process'

export class ProcessRunner {
  run(command, args, cwd) {
    const result = spawnSync(command, args, {
      cwd,
      encoding: 'utf8'
    })
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    if (result.error !== undefined) {
      return {
        exitCode: 1,
        output: `${output}${result.error.message}`
      }
    }
    return {
      exitCode: result.status ?? 1,
      output
    }
  }
}
