import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Check } from './check.mjs'
import { Version } from './version.mjs'

export class VersionBump extends Check {
  static #VERSION_PAIR = /("version": ")[^"]*(")/g
  static #SKILL_VERSION = /^(  version: )([^\r\n]*)(\r?)$/

  #repository
  #writer

  constructor(repository, writer) {
    super()
    this.#repository = repository
    this.#writer = writer
    Object.freeze(this)
  }

  get name() {
    return 'version-bump'
  }

  inspect(report) {
    const version = Version.parse(this.#repository.packageVersion)
    const marketplace = this.#repository.marketplace()
    const plugins = marketplace.plugins()
    const results = []
    for (const plugin of plugins) {
      for (const skill of plugin.skills()) {
        results.push(this.#bumpSkill(skill, version, report))
      }
    }
    results.push(this.#bumpManifest(
      join(this.#repository.root, '.claude-plugin', 'marketplace.json'),
      version,
      report))
    for (const plugin of plugins) {
      results.push(this.#bumpManifest(
        join(plugin.directory, '.claude-plugin', 'plugin.json'),
        version,
        report))
    }
    // A file that already holds the version was still versioned.
    const versioned = results.filter((result) => result !== null).length
    const changed = results.filter((result) => result === true).length
    report.count('versioned file(s)', versioned)
    report.note(`changed ${changed} file(s)`)
  }

  #bumpSkill(skill, version, report) {
    const text = readFileSync(skill.path, 'utf8')
    const updated = this.#replaceSkillVersion(text, version)
    if (updated === null) {
      report.error(
        skill.path,
        'No "  version:" line in the metadata block')
      return null
    }
    if (updated === text) return false
    this.#writer.write(skill.path, updated)
    return true
  }

  #bumpManifest(path, version, report) {
    const text = readFileSync(path, 'utf8')
    // A manifest without a version does not hold one after the run.
    if (text.match(VersionBump.#VERSION_PAIR) === null) return null
    const updated = text.replace(
      VersionBump.#VERSION_PAIR,
      (_, before, after) => `${before}${version}${after}`)
    if (updated === text) return false
    try {
      JSON.parse(updated)
    } catch {
      report.error(
        path,
        'Manifest is not valid JSON after the version replacement')
      return null
    }
    this.#writer.write(path, updated)
    return true
  }

  #replaceSkillVersion(text, version) {
    const lines = text.split('\n')
    const first = lines[0].replace(/^\uFEFF/, '')
    if (first !== '---' && first !== '---\r') return null
    let end = 1
    while (end < lines.length &&
      lines[end] !== '---' &&
      lines[end] !== '---\r') {
      end += 1
    }
    if (end === lines.length) return null
    let inMetadata = false
    for (let index = 1; index < end; index += 1) {
      const line = lines[index].endsWith('\r')
        ? lines[index].slice(0, -1)
        : lines[index]
      if (line === 'metadata:') {
        inMetadata = true
        continue
      }
      if (!inMetadata) continue
      if (line !== '' && !line.startsWith('  ')) break
      const match = VersionBump.#SKILL_VERSION.exec(lines[index])
      if (match === null) continue
      lines[index] = `${match[1]}${version}${match[3]}`
      return lines.join('\n')
    }
    return null
  }
}
