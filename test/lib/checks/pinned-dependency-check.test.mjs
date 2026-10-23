import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PinnedDependencyCheck } from '../../../scripts/lib/checks/pinned-dependency-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create(dependencies = {}, devDependencies = {}) {
    const root = await mkdtemp(join(tmpdir(), 'oo-pinned-'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
        dependencies,
        devDependencies
      }))
    return new TempRepository(root)
  }

  constructor(root) {
    this.#root = root
  }

  inspect() {
    const report = new Report()
    new PinnedDependencyCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('exact and prerelease dependencies pass the pinned dependency check', async () => {
  const repository = await TempRepository.create(
    { alpha: '1.2.3', beta: '2.0.0-alpha.1' },
    { gamma: '0.0.1' })
  try {
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 3 dependency(ies)'])
  } finally {
    await repository.close()
  }
})

test('range, tag, URL and path dependencies are rejected', async () => {
  const repository = await TempRepository.create(
    {
      range: '^1.2.3',
      tag: 'latest',
      url: 'https://example.com/pkg.tgz',
      path: 'file:../pkg'
    },
    { tilde: '~1.2.3' })
  try {
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      'error package.json: dependency range is not pinned to an exact ' +
      'version: ^1.2.3'))
    assert.ok(report.lines().includes(
      'error package.json: dependency tag is not pinned to an exact ' +
      'version: latest'))
    assert.ok(report.lines().includes(
      'error package.json: dependency url is not pinned to an exact ' +
      'version: https://example.com/pkg.tgz'))
    assert.ok(report.lines().includes(
      'error package.json: dependency path is not pinned to an exact ' +
      'version: file:../pkg'))
    assert.ok(report.lines().includes(
      'error package.json: dependency tilde is not pinned to an exact ' +
      'version: ~1.2.3'))
  } finally {
    await repository.close()
  }
})
