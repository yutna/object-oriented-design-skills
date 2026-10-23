import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

import { RepoError } from '../errors.mjs'
import { TextFile } from '../text-file.mjs'
import { TaskCase } from './task-case.mjs'

export class TaskCases {
  static #DIRECTORY = 'evals/tasks'
  static #EXTENSION = '.yaml'

  static of(repository) {
    const directory = join(repository.root, TaskCases.#DIRECTORY)
    const fileNames = readdirSync(directory)
      .filter((fileName) => fileName.endsWith(TaskCases.#EXTENSION))
      .sort((left, right) => left.localeCompare(right))
    return Object.freeze(fileNames.map((fileName) =>
      TaskCases.#read(directory, fileName)))
  }

  static #read(directory, fileName) {
    const textFile = TextFile.read(join(directory, fileName))
    let data
    try {
      data = parse(textFile.text)
    } catch (error) {
      throw new RepoError(
        `Invalid YAML in ${textFile.path}: ${error.message}`)
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new RepoError(`Task case is not a mapping: ${textFile.path}`)
    }
    const context = data.context ?? {}
    const execution = data.execution ?? {}
    return new TaskCase(
      data.name,
      fileName,
      data.schema_version,
      data.tags,
      context.scaffold_script,
      execution.allowed_tools,
      data.graders)
  }
}
