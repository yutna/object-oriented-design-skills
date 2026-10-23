export class Action {
  apply(source, target, fileSystem, report, dryRun) {
    throw new Error('Action.apply must be overridden')
  }
}
