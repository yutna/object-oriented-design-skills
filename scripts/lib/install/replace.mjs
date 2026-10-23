import { basename } from 'node:path'

import { Action } from './action.mjs'

export class Replace extends Action {
  apply(source, target, fileSystem, report, dryRun) {
    const name = basename(source)
    if (dryRun) {
      report.note(`would copy ${name} -> ${target}`)
      return
    }
    fileSystem.remove(target)
    fileSystem.copyDirectory(source, target)
    report.note(`copied ${name} -> ${target}`)
  }
}
