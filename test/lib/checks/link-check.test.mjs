import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { LinkCheck } from '../../../scripts/lib/checks/link-check.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { Repository } from '../../../scripts/lib/repository.mjs'

class TempRepository {
  #root

  static async create() {
    return new TempRepository(
      await mkdtemp(join(tmpdir(), 'oo-link-')))
  }

  constructor(root) {
    this.#root = root
  }

  async write(relativePath, text) {
    const path = this.path(relativePath)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, text)
  }

  path(relativePath) {
    return join(this.#root, relativePath)
  }

  inspect() {
    const report = new Report()
    new LinkCheck(Repository.at(this.#root)).run(report)
    return report
  }

  async close() {
    await rm(this.#root, { recursive: true, force: true })
  }
}

test('a valid link set passes the link check', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.write('README.md', [
      '# Readme',
      '## Overview',
      '[License](LICENSE)',
      '[Overview](#overview)',
      '[Details](docs/other.md#details)',
      '[Reference][ref]',
      '[Web](https://example.com)',
      '[Mail](mailto:test@example.com)',
      '',
      '[ref]: docs/other.md',
      ''
    ].join('\n'))
    await repository.write('LICENSE', 'MIT\n')
    await repository.write('docs/other.md', '# Other\n## Details\n')
    const report = repository.inspect()
    assert.equal(report.failed, false)
    assert.deepEqual(report.lines(), ['ok 4 link(s)'])
  } finally {
    await repository.close()
  }
})

test('a relative target must exist', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.write('README.md', [
      '# Readme',
      '[Missing](missing.md)',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.path('README.md')}: ` +
      'link target does not exist: missing.md'))
  } finally {
    await repository.close()
  }
})

test('an anchor in the same file must exist', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.write('README.md', [
      '# Readme',
      '[Missing](#missing)',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.path('README.md')}: ` +
      'link anchor does not exist: #missing'))
  } finally {
    await repository.close()
  }
})

test('an anchor in another Markdown file must exist', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.write('README.md', [
      '# Readme',
      '[Missing](docs/other.md#missing)',
      ''
    ].join('\n'))
    await repository.write('docs/other.md', '# Other\n## Details\n')
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.path('README.md')}: ` +
      'link anchor does not exist: docs/other.md#missing'))
  } finally {
    await repository.close()
  }
})

test('a broken reference-style link is checked', async () => {
  const repository = await TempRepository.create()
  try {
    await repository.write('README.md', [
      '# Readme',
      '[Broken][missing]',
      '',
      '[missing]: missing.md',
      ''
    ].join('\n'))
    const report = repository.inspect()
    assert.ok(report.lines().includes(
      `error ${repository.path('README.md')}: ` +
      'link target does not exist: missing.md'))
  } finally {
    await repository.close()
  }
})
