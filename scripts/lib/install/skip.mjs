import { basename } from 'node:path'

import { Action } from './action.mjs'

export class Skip extends Action {
  apply(source, target, fileSystem, report, dryRun) {
    report.note(
      `skipped ${basename(source)} ` +
      '(already installed; --force replaces it)')
  }
}
