export class PluginCopy {
  static of(repository) {
    return new PluginCopy(repository.root)
  }

  #root

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get path() {
    return this.#root
  }

  skills() {
    return []
  }

  close() {}
}
