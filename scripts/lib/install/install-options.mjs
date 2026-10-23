import { RepoError } from '../errors.mjs'

export class InstallOptions {
  static #DEFAULT = 'object-oriented-design-skills'
  static #OPTIONS = Object.freeze([
    '--force',
    '--dry-run',
    '--plugin',
    '--all'
  ])

  #plugins
  #force
  #dryRun

  constructor(plugins, force, dryRun) {
    this.#plugins = Object.freeze([...plugins])
    this.#force = force
    this.#dryRun = dryRun
    Object.freeze(this)
  }

  static parse(argv, marketplace) {
    const valid = marketplace.plugins().map(({ name }) => name)
    let force = false
    let dryRun = false
    let all = false
    const requested = []
    for (let index = 0; index < argv.length; index += 1) {
      const argument = argv[index]
      if (argument === '--force') {
        force = true
        continue
      }
      if (argument === '--dry-run') {
        dryRun = true
        continue
      }
      if (argument === '--all') {
        all = true
        continue
      }
      if (argument === '--plugin') {
        const name = argv[index + 1]
        if (name === undefined) {
          throw new RepoError(
            'missing value for --plugin; valid options: ' +
            InstallOptions.#OPTIONS.join(', '))
        }
        requested.push(name)
        index += 1
        continue
      }
      throw new RepoError(
        `unknown option: ${argument}; valid options: ` +
        InstallOptions.#OPTIONS.join(', '))
    }
    const unknown = requested.find((name) => !valid.includes(name))
    if (unknown !== undefined) {
      throw new RepoError(
        `unknown plugin: ${unknown}; valid plugins: ${valid.join(', ')}`)
    }
    if (all) return new InstallOptions(valid, force, dryRun)
    if (requested.length > 0) {
      return new InstallOptions([...new Set(requested)], force, dryRun)
    }
    return new InstallOptions([InstallOptions.#DEFAULT], force, dryRun)
  }

  get plugins() {
    return this.#plugins
  }

  get force() {
    return this.#force
  }

  get dryRun() {
    return this.#dryRun
  }

  equals(other) {
    return other instanceof InstallOptions &&
      other.#force === this.#force &&
      other.#dryRun === this.#dryRun &&
      other.#plugins.length === this.#plugins.length &&
      other.#plugins.every((name, index) => name === this.#plugins[index])
  }
}
