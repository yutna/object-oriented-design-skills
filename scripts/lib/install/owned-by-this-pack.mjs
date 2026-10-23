import { Ownership } from './ownership.mjs'
import { Replace } from './replace.mjs'
import { Skip } from './skip.mjs'

export class OwnedByThisPack extends Ownership {
  decide(options) {
    return options.force ? new Replace() : new Skip()
  }
}
