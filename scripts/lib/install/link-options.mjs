import { RepoError } from '../errors.mjs'

export class LinkOptions {
  static #DEFAULT = 'object-oriented-design-skills'
  static #OPTIONS = Object.freeze(['--plugin', '--all', '--remove'])

  #plugins
  #remove

  constructor(plugins, remove) {
    this.#plugins = Object.freeze([...plugins])
    this.#remove = remove
    Object.freeze(this)
  }

  static parse(argv, marketplace) {
    const valid = marketplace.plugins().map(({ name }) => name)
    let remove = false
    let all = false
    const requested = []
    for (let index = 0; index < argv.length; index += 1) {
      const argument = argv[index]
      if (argument === '--remove') {
        remove = true
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
            LinkOptions.#OPTIONS.join(', '))
        }
        requested.push(name)
        index += 1
        continue
      }
      throw new RepoError(
        `unknown option: ${argument}; valid options: ` +
        LinkOptions.#OPTIONS.join(', '))
    }
    const unknown = requested.find((name) => !valid.includes(name))
    if (unknown !== undefined) {
      throw new RepoError(
        `unknown plugin: ${unknown}; valid plugins: ${valid.join(', ')}`)
    }
    if (all) return new LinkOptions(valid, remove)
    if (requested.length > 0) {
      return new LinkOptions([...new Set(requested)], remove)
    }
    return new LinkOptions([LinkOptions.#DEFAULT], remove)
  }

  get plugins() {
    return this.#plugins
  }

  get remove() {
    return this.#remove
  }

  equals(other) {
    return other instanceof LinkOptions &&
      other.#remove === this.#remove &&
      other.#plugins.length === this.#plugins.length &&
      other.#plugins.every((name, index) => name === this.#plugins[index])
  }
}
