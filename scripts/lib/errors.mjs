export class RepoError extends Error {
  #exitCode

  constructor(message, exitCode = 1) {
    super(message)
    this.#exitCode = exitCode
  }

  get exitCode() {
    return this.#exitCode
  }
}

export class QueueGateError extends RepoError {
  constructor() {
    // A tier run outside the queue would spend quota unmeasured.
    super('run it through scripts/eval-queue.mjs', 2)
  }
}

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
