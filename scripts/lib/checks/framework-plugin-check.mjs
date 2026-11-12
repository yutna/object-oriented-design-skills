import { Check } from '../check.mjs'

export class FrameworkPluginCheck extends Check {
  get name() {
    return 'framework-plugin'
  }

  inspect(report) {
  }
}
