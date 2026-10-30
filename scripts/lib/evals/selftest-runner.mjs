import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { Plugin } from '../plugin.mjs'

export class SelftestRunner {
  static #MANIFEST = join('.claude-plugin', 'plugin.json')

  #calls = 0

  run(command, args, cwd) {
    this.#calls += 1
    const directory = SelftestRunner.#pluginDir(args)
    const listings = SelftestRunner.#plugins(directory)
      .flatMap((plugin) => plugin.skills().map((skill) => ({
        plugin: plugin.name,
        skill: skill.name
      })))
    const [first] = listings
    const answer = first === undefined
      ? 'none'
      : `${first.plugin}:${first.skill}`
    // A selftest must never reach the model, so it answers from the copy.
    const events = [
      {
        type: 'system',
        subtype: 'init',
        skills: listings.map(({ plugin, skill }) =>
          `${plugin}:${skill}`)
      },
      {
        type: 'result',
        subtype: 'success',
        result: answer
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
    return args[index + 1]
  }

  static #plugins(directory) {
    // Tier 2 passes one plugin; tier 1 passes a folder of plugins.
    if (existsSync(join(directory, SelftestRunner.#MANIFEST))) {
      return [new Plugin(directory)]
    }
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(directory, entry.name))
      .filter((child) =>
        existsSync(join(child, SelftestRunner.#MANIFEST)))
      .sort()
      .map((child) => new Plugin(child))
  }
}
