import { basename } from 'node:path'

import { Action } from './action.mjs'

export class Copy extends Action {
  apply(source, target, fileSystem, report, dryRun) {
    const name = basename(source)
    if (dryRun) {
      report.note(`would copy ${name} -> ${target}`)
      return
    }
    fileSystem.copyDirectory(source, target)
    report.note(`copied ${name} -> ${target}`)
  }
}
