import { Copy } from './copy.mjs'
import { Ownership } from './ownership.mjs'

export class NotInstalled extends Ownership {
  decide(options) {
    return new Copy()
  }
}
