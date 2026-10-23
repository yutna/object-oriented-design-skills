import { join } from 'node:path'

import { Frontmatter } from '../frontmatter.mjs'
import { TextFile } from '../text-file.mjs'
import { NotInstalled } from './not-installed.mjs'
import { OwnedByOtherPack } from './owned-by-other-pack.mjs'
import { OwnedByThisPack } from './owned-by-this-pack.mjs'
import { Unmarked } from './unmarked.mjs'

export class OwnershipReader {
  static #PACK = 'object-oriented-design-skills'
  static #SKILL = 'SKILL.md'

  #fileSystem

  constructor(fileSystem) {
    this.#fileSystem = fileSystem
    Object.freeze(this)
  }

  of(directory) {
    if (!this.#fileSystem.exists(directory)) return new NotInstalled()
    // A directory that cannot name its pack is not this pack's to replace.
    const path = join(directory, OwnershipReader.#SKILL)
    const text = this.#fileSystem.readText(path)
    if (text === null) return new Unmarked()
    let frontmatter
    try {
      frontmatter = Frontmatter.of(new TextFile(path, text))
    } catch {
      return new Unmarked()
    }
    const metadata = frontmatter.get('metadata')
    if (metadata === null ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata)) {
      return new Unmarked()
    }
    const pack = metadata.pack
    if (typeof pack !== 'string' || pack === '') return new Unmarked()
    if (pack === OwnershipReader.#PACK) return new OwnedByThisPack()
    return new OwnedByOtherPack(pack)
  }
}
