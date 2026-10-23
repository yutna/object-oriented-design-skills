import { chmodSync, cpSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

import { RepoError } from '../errors.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'
import { QuestionCase } from './question-case.mjs'
import { Scenarios } from './scenarios.mjs'
import { TaskCases } from './task-cases.mjs'

export class EvalBuild {
  static #SCENARIOS = 'evals/scenarios.md'
  static #TASKS = 'evals/tasks'
  static #FIXTURE = 'evals/fixture-tasks'
  static #FIXTURE_NAME = 'fixture-tasks'
  static #SCRIPT = 'fixture.sh'
  static #BLOCK = 'plugins/core/skills/oo-design/references/claude-md-block.md'
  static #FAMILIES = Object.freeze(['task', 'restraint', 'precedence'])
  static #SCRIPT_BODY = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'cp -R "$here/fixture-tasks/." .',
    ''
  ].join('\n')

  #repository
  #copy

  constructor(repository, copy) {
    this.#repository = repository
    this.#copy = copy
    Object.freeze(this)
  }

  build({ arm = 'none', only = [], tag = null } = {}) {
    // A block arm stands in for a project's CLAUDE.md, which never loads in
    // a run; a baseline arm measures the plugin without that block.
    if (arm !== 'none' && arm !== 'block' && arm !== 'baseline') {
      throw new RepoError(
        `--arm must be none, block or baseline, not "${arm}"`, 2)
    }
    const block = arm === 'block' ? this.#block() : null
    const entries = this.#entries(block)
    const selected = this.#select(entries, only, tag)
    for (const entry of selected) {
      this.#write(entry)
    }
    // The dry run prints these, so each entry carries only what that output needs.
    return Object.freeze(selected.map((entry) => Object.freeze({
      name: entry.name,
      family: entry.family,
      tags: entry.tags,
      document: entry.document
    })))
  }

  #entries(block) {
    const scenarios = Scenarios.of(
      this.#repository.file(EvalBuild.#SCENARIOS))
    // A scenario contributes a question; its prompt already holds the problem.
    const questions = scenarios.map((scenario) =>
      this.#questionEntry(new QuestionCase(scenario), block))
    const tasks = TaskCases.of(this.#repository)
      .map((taskCase) => this.#taskEntry(taskCase, block))
    return [...questions, ...tasks]
  }

  #questionEntry(questionCase, block) {
    const systemPrompt = block === null
      ? questionCase.appendSystemPrompt
      : `${questionCase.appendSystemPrompt}\n\n${block}`
    return {
      name: questionCase.name,
      family: questionCase.family,
      tags: questionCase.tags,
      document: questionCase.document(systemPrompt),
      text: null,
      task: false
    }
  }

  #taskEntry(taskCase, block) {
    const text = this.#repository.file(
      join(EvalBuild.#TASKS, taskCase.fileName)).text
    return {
      name: taskCase.name,
      // The family tag is what the dry run prints for a task case.
      family: this.#familyOf(taskCase),
      tags: taskCase.tags,
      document: block === null ? null : this.#withBlock(text, block),
      text: block === null ? text : null,
      task: true
    }
  }

  #withBlock(text, block) {
    const document = parse(text)
    const execution = document.execution ?? {}
    const own = execution.append_system_prompt
    // A case keeps its own system text, with the block after it.
    const appended = [own, block]
      .filter((part) => typeof part === 'string' && part !== '')
      .join('\n\n')
    document.execution = { ...execution, append_system_prompt: appended }
    return document
  }

  #familyOf(taskCase) {
    const family = taskCase.tags.find((tag) =>
      EvalBuild.#FAMILIES.includes(tag))
    if (family === undefined) {
      throw new RepoError(
        `${taskCase.fileName}: tags hold no family of ` +
        'task, restraint or precedence')
    }
    return family
  }

  #select(entries, only, tag) {
    const known = new Set(entries.map((entry) => entry.name))
    const missing = only.filter((name) => !known.has(name))
    if (missing.length > 0) {
      throw new RepoError(
        `--only names no case: ${missing.join(', ')}`, 2)
    }
    // A selection that kept nothing would build nothing to read.
    const chosen = entries.filter((entry) =>
      (only.length === 0 || only.includes(entry.name)) &&
      (tag === null || entry.tags.includes(tag)))
    if (chosen.length === 0) {
      throw new RepoError(
        'the selection builds no case, so nothing would be measured', 2)
    }
    return chosen
  }

  #write(entry) {
    const directory = join(this.#copy.path, 'evals', entry.name)
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      join(directory, 'case.yaml'),
      entry.text ?? stringify(entry.document, { lineWidth: 0 }))
    if (entry.task) {
      this.#writeFixture(directory)
    }
  }

  #writeFixture(directory) {
    // The scaffold runs inside the copy, so the fixture travels beside the case.
    cpSync(
      join(this.#repository.root, EvalBuild.#FIXTURE),
      join(directory, EvalBuild.#FIXTURE_NAME),
      { recursive: true })
    const script = join(directory, EvalBuild.#SCRIPT)
    writeFileSync(script, EvalBuild.#SCRIPT_BODY)
    chmodSync(script, 0o755)
  }

  #block() {
    // The block is the text the pack tells a project to add to its CLAUDE.md.
    const file = this.#repository.file(EvalBuild.#BLOCK)
    const fence = new MarkdownDocument(file).fences()
      .find((candidate) => candidate.language === 'markdown')
    if (fence === undefined || fence.body.trim() === '') {
      throw new RepoError(
        `${EvalBuild.#BLOCK} must hold the block in a markdown fence`)
    }
    return fence.body.trim()
  }
}
