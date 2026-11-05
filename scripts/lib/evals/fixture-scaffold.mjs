import { RepoError } from '../errors.mjs'

export class FixtureScaffold {
  static #DEFAULT_SCRIPT = 'fixture.sh'
  static #DEFAULT_FOLDER = 'fixture-tasks'
  static #NAMED_SCRIPT = /^fixture-([a-z0-9-]+)\.sh$/
  static #ROOT = 'evals'

  #script
  #folder

  static of(repository, script) {
    const scaffold = new FixtureScaffold(
      script, FixtureScaffold.#folderOf(script))
    if (!repository.exists(scaffold.directory)) {
      throw new RepoError(
        `context.scaffold_script "${script}" names ` +
        `${scaffold.directory}/, which does not exist`)
    }
    return scaffold
  }

  static #folderOf(script) {
    if (script === FixtureScaffold.#DEFAULT_SCRIPT) {
      return FixtureScaffold.#DEFAULT_FOLDER
    }
    const match = FixtureScaffold.#NAMED_SCRIPT.exec(script ?? '')
    if (match === null) {
      throw new RepoError(
        `context.scaffold_script "${script}" must be ` +
        'fixture.sh for evals/fixture-tasks/ or fixture-<name>.sh ' +
        'for evals/fixture-<name>/')
    }
    return `fixture-${match[1]}`
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
