import { Check } from '../check.mjs'

export class ValidLib extends Check {
  inspect(report) {
    report.count('file(s)', 1)
  }
}
