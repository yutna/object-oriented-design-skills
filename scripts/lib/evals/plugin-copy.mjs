import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Plugin } from '../plugin.mjs'
import { TaskCases } from './task-cases.mjs'
import { TaskCaseSkills } from './task-case-skills.mjs'

export class PluginCopy {
  static #SOURCE = 'plugins/core'
  static #PLUGINS = 'plugins'
  static #MANIFEST = join('.claude-plugin', 'plugin.json')
  static #QUESTION = 'question'

  #root
  #path

  static of(repository, cases = []) {
    // The model must see a pristine copy, so every run gets its own folder.
    const root = mkdtempSync(join(tmpdir(), 'oo-plugin-copy-'))
    const path = join(root, 'plugin')
    try {
      cpSync(join(repository.root, PluginCopy.#SOURCE), path, {
        recursive: true
      })
      const copy = new PluginCopy(root, path)
      copy.#copyNamedSkills(repository, cases)
      return copy
    } catch (error) {
      rmSync(root, { recursive: true, force: true })
      throw error
    }
  }

  constructor(root, path) {
    this.#root = root
    this.#path = path
    Object.freeze(this)
  }

  get path() {
    return this.#path
  }

  skills() {
    // Reading the copy proves the listing belongs to the files the model saw.
    return new Plugin(this.#path).skills()
      .map((skill) => skill.name)
  }

  close() {
    // The copy holds no result, so it goes as soon as the run ends.
    rmSync(this.#root, { recursive: true, force: true })
  }

  #copyNamedSkills(repository, cases) {
    const taskCases = this.#namedTaskCases(repository, cases)
    // A piece whose cases name no outside skill keeps exactly the core copy.
    if (taskCases.length === 0) return
    for (const skill of PluginCopy.#outsideSkills(repository)) {
      if (!taskCases.some((taskCase) => taskCase.names(skill.name))) continue
      // The folder goes beside the core skills, so the copy stays one plugin.
      cpSync(
        dirname(skill.path),
        join(this.#path, 'skills', skill.directoryName),
        { recursive: true })
    }
  }

  #namedTaskCases(repository, cases) {
    // A question case measures no language, so it asks for no outside skill.
    const names = new Set(cases
      .filter(({ family }) => family !== PluginCopy.#QUESTION)
      .map(({ name }) => name))
    if (names.size === 0) return []
    return TaskCases.of(repository)
      .filter((taskCase) => names.has(taskCase.name))
      .map((taskCase) => new TaskCaseSkills(taskCase))
  }

  static #outsideSkills(repository) {
    const directory = join(repository.root, PluginCopy.#PLUGINS)
    if (!existsSync(directory)) return []
    const core = join(repository.root, PluginCopy.#SOURCE)
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(directory, entry.name))
      .filter((plugin) =>
        plugin !== core && existsSync(join(plugin, PluginCopy.#MANIFEST)))
      .flatMap((plugin) => new Plugin(plugin).skills())
  }
}
