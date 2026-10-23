import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { OopCheck } from '../../../scripts/lib/checks/oop-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  static #FIXTURES = fileURLToPath(
    new URL('../../fixtures/oop/', import.meta.url))

  #root

  static async create() {
    const root = await mkdtemp(join(tmpdir(), 'oo-oop-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  async install(relativePath, fixture) {
    const destination = join(this.#root, relativePath)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(join(TempRepository.#FIXTURES, fixture), destination)
  }

  async write(relativePath, text) {
    const destination = join(this.#root, relativePath)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, text)
  }

  async inspect() {
    const report = new Report()
    await new OopCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('the valid lib fixture passes', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.install(
      join('scripts', 'lib', 'valid-lib.mjs'),
      'valid-lib.mjs')
    const report = await repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 1 file(s), 1 class(es)'])
  } finally {
    await repository.close()
  }
})

test('a top-level function yields exactly its error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'lib', 'top-level-function.mjs')
    await repository.install(file, 'top-level-function.mjs')
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}:6: top-level FunctionDeclaration is not allowed`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a top-level const yields exactly its error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'lib', 'top-level-const.mjs')
    await repository.install(file, 'top-level-const.mjs')
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}:6: top-level VariableDeclaration is not allowed`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('an export function yields exactly its error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'lib', 'export-function.mjs')
    await repository.install(file, 'export-function.mjs')
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}:6: top-level ExportNamedDeclaration is not allowed`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a lib class whose name does not match the file yields its error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'lib', 'wrong-name.mjs')
    await repository.install(file, 'wrong-name.mjs')
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}: exports no class named wrong-name`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('an entry script with an unguarded call yields its error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'unguarded-entry.mjs')
    await repository.install(file, 'unguarded-entry.mjs')
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}:7: top-level ExpressionStatement is not allowed`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('a lib file with no exported class yields its error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'lib', 'no-class.mjs')
    await repository.write(
      file,
      "import { Check } from '../check.mjs'\n")
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}: exports no class`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('an entry script with no guard yields its guard error', async () => {
  const repository = await TempRepository.create()
  try {
    const file = join('scripts', 'no-guard.mjs')
    await repository.write(
      file,
      "import { Cli } from './lib/cli.mjs'\n")
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      `error ${file}: needs exactly one import.meta.main guard`,
      'failed: 1 error(s)'
    ])
  } finally {
    await repository.close()
  }
})

test('an empty repository fails with measured nothing', async () => {
  const repository = await TempRepository.create()
  try {
    const report = await repository.inspect()
    assert.equal(report.failed, true)
    assert.deepEqual(report.lines(), [
      'failed: measured nothing (0 file(s), 0 class(es))'
    ])
  } finally {
    await repository.close()
  }
})
