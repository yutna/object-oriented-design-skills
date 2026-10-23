export class RepoError extends Error {}

export class UnreadableFileError extends RepoError {
  constructor(path) {
    super(`Cannot read file: ${path}`)
  }
}

export class FrontmatterError extends RepoError {
  constructor(path, detail) {
    super(`${detail}: ${path}`)
  }
}

export class ManifestError extends RepoError {
  constructor(path, detail) {
    super(`${detail}: ${path}`)
  }
}
