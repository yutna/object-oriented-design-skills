export class RepoError extends Error {}

export class UnreadableFileError extends RepoError {
  constructor(path) {
    super(`Cannot read file: ${path}`)
  }
}
