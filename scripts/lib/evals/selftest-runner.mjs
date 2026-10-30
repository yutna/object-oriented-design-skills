import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { Plugin } from '../plugin.mjs'

export class SelftestRunner {
  static #PLUGIN = 'object-oriented-design-skills'
  static #MANIFEST = join('.claude-plugin', 'plugin.json')

  #calls = 0

  run(command, args, cwd) {
    this.#calls += 1
    const copy = SelftestRunner.#pluginDir(args)
    const skills = new Plugin(copy).skills()
      .map((skill) => skill.name)
    const answer = skills[0] ?? 'none'
    // A selftest must never reach the model, so it answers from the copy.
    const events = [
      {
        type: 'system',
        subtype: 'init',
        skills: skills.map((skill) =>
          `${SelftestRunner.#PLUGIN}:${skill}`)
      },
      {
        type: 'result',
        subtype: 'success',
        result: answer === 'none'
          ? 'none'
          : `${SelftestRunner.#PLUGIN}:${answer}`
      }
    ]
    return {
      exitCode: 0,
      output: `${events
        .map((event) => JSON.stringify(event))
        .join('\n')}\n`
    }
  }

  get calls() {
    return this.#calls
  }

  static #pluginDir(args) {
    const index = args.indexOf('--plugin-dir')
    const path = args[index + 1]
    if (existsSync(join(path, SelftestRunner.#MANIFEST))) return path
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(path, entry.name))
      .find((directory) =>
        existsSync(join(directory, SelftestRunner.#MANIFEST)))
  }
}
