import { Conflict } from './conflict.mjs'
import { Ownership } from './ownership.mjs'

export class OwnedByOtherPack extends Ownership {
  #pack

  constructor(pack) {
    super()
    this.#pack = pack
    Object.freeze(this)
  }

  get pack() {
    return this.#pack
  }

  decide(options) {
    return new Conflict(this.#pack)
  }
}
