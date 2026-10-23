import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
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

  link(target, path) {
    // A Windows junction is a link without admin rights; it needs an
    // absolute target, which the link-local entry always supplies.
    const type = process.platform === 'win32' ? 'junction' : 'dir'
    symlinkSync(target, path, type)
  }

  isLink(path) {
    try {
      return lstatSync(path).isSymbolicLink()
    } catch {
      return false
    }
  }

  readDirectory(path) {
    return readdirSync(path)
  }
}
