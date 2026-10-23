import { Conflict } from './conflict.mjs'
import { Ownership } from './ownership.mjs'

export class Unmarked extends Ownership {
  // Most skills in the world carry no marker, so unmarked never means ours.
  decide(options) {
    return new Conflict(null)
  }
}
