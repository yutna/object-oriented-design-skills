import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Skill } from '../../scripts/lib/skill.mjs'
import { TextFile } from '../../scripts/lib/text-file.mjs'

test('a Skill reads its frontmatter, document and references', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-skill-'))
  try {
    const directory = join(root, 'oo-demo')
    const references = join(directory, 'references')
    await mkdir(references, { recursive: true })
    const path = join(directory, 'SKILL.md')
    await writeFile(path, [
      '---',
      'name: oo-demo',
      'description: Use when testing.',
      'metadata:',
      '  version: 0.1.0',
      '  pack: object-oriented-design-skills',
      '---',
      '# Demo',
      ''
    ].join('\n'))
    await writeFile(join(references, 'b.md'), '# B\n')
    await writeFile(join(references, 'a.md'), '# A\n')
    await writeFile(join(references, 'image.png'), 'not markdown\n')
    await mkdir(join(references, 'nested'))

    const skill = new Skill(directory, TextFile.read(path))
    assert.equal(skill.directoryName, 'oo-demo')
    assert.equal(skill.frontmatter.get('name'), 'oo-demo')
    assert.equal(skill.name, 'oo-demo')
    assert.equal(skill.description, 'Use when testing.')
    assert.deepEqual(skill.metadata, {
      version: '0.1.0',
      pack: 'object-oriented-design-skills'
    })
    assert.equal(Object.isFrozen(skill.metadata), true)
    assert.deepEqual(
      skill.document.headings().map((heading) => heading.text),
      ['Demo'])
    assert.equal(skill.path, path)
    assert.deepEqual(
      skill.referenceFiles().map((file) => file.path),
      [join(references, 'a.md'), join(references, 'b.md')])
    assert.deepEqual(
      skill.referenceEntries(),
      ['a.md', 'b.md', 'image.png', 'nested/'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a Skill without references has no reference entries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oo-skill-empty-'))
  try {
    const directory = join(root, 'oo-demo')
    await mkdir(directory, { recursive: true })
    const path = join(directory, 'SKILL.md')
    await writeFile(path, [
      '---',
      'name: oo-demo',
      'description: Use when testing.',
      'metadata:',
      '  version: 0.1.0',
      '  pack: object-oriented-design-skills',
      '---',
      '# Demo',
      ''
    ].join('\n'))

    const skill = new Skill(directory, TextFile.read(path))
    assert.deepEqual(skill.referenceEntries(), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
