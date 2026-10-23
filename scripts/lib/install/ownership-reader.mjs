export class OwnershipReader {
  constructor(fileSystem) {
    this.fileSystem = fileSystem
    Object.freeze(this)
  }

  of(directory) {
    return null
  }
}
