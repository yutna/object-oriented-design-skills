import { RepoError } from '../errors.mjs'

export class FixtureScaffold {
  static #SCRIPT = 'fixture.sh'
  static #FOLDER = 'fixture-tasks'
  static #ROOT = 'evals'

  #script
  #folder

  static of(repository, script) {
    // Stub: every case still gets the one default fixture.
    return new FixtureScaffold(script, FixtureScaffold.#FOLDER)
  }

  constructor(script, folder) {
    this.#script = script
    this.#folder = folder
    Object.freeze(this)
  }

  get script() {
    return this.#script
  }

  get folder() {
    return this.#folder
  }

  get directory() {
    return `${FixtureScaffold.#ROOT}/${this.#folder}`
  }

  get scriptText() {
    return [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
      `cp -R "$here/${this.#folder}/." .`,
      ''
    ].join('\n')
  }
}
