import { Check } from '../check.mjs'

export class LocalLinks extends Check {
  constructor(repository, argv, fileSystem) {
    super()
    Object.freeze(this)
  }

  get name() {
    return 'link-local'
  }

  inspect(report) {
  }
}
