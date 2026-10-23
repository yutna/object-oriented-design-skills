import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync
} from 'node:fs'

export class FileSystem {
  exists(path) {
    return existsSync(path)
  }

  readText(path) {
    try {
      return readFileSync(path, 'utf8')
    } catch {
      return null
    }
  }

  copyDirectory(source, target) {
    cpSync(source, target, { recursive: true })
  }

  remove(path) {
    // A link is not the folder it points at, so remove only the link.
    if (lstatSync(path).isSymbolicLink()) {
      unlinkSync(path)
      return
    }
    rmSync(path, { recursive: true, force: true })
  }

  makeDirectory(path) {
    mkdirSync(path, { recursive: true })
  }
}
