export class Check {
  get name() {
    throw new Error('Check.name must be overridden')
  }

  inspect(report) {
    throw new Error('Check.inspect must be overridden')
  }

  run(report) {
    return this.inspect(report)
  }
}
