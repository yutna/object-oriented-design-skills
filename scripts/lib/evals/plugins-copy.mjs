export class PluginsCopy {
  static of(repository) {
    return new PluginsCopy(repository.root)
  }

  #root

  constructor(root) {
    this.#root = root
    Object.freeze(this)
  }

  get path() {
    return this.#root
  }

  listing() {
    return []
  }

  close() {}
}
