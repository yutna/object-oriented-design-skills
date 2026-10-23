import { Ownership } from './ownership.mjs'

export class OwnedByOtherPack extends Ownership {
  constructor(pack) {
    super()
    this.pack = pack
    Object.freeze(this)
  }
}
