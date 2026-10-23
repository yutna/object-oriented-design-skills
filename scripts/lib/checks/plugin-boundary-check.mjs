import { dirname, isAbsolute, relative, resolve } from 'node:path'

import { Check } from '../check.mjs'
import { MarkdownDocument } from '../markdown-document.mjs'

export class PluginBoundaryCheck extends Check {
  static #NAME = /^oo-[a-z0-9]+(-[a-z0-9]+)*$/
  static #EXTERNAL = Object.freeze([
    'http:',
    'https:',
    'mailto:'
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'plugin-boundary'
  }

  inspect(report) {
    const plugins = this.#repository.marketplace().plugins()
    const names = new Set(plugins.flatMap((plugin) =>
      plugin.skills().map((skill) => skill.name)))
    let links = 0
    let skillNames = 0
    for (const plugin of plugins) {
      for (const skill of plugin.skills()) {
        const counts = this.#inspectSkill(plugin, skill, names, report)
        links += counts.links
        skillNames += counts.skillNames
      }
    }
    report.count('boundary link(s)', links)
    report.count('skill name(s)', skillNames)
  }

  #inspectSkill(plugin, skill, names, report) {
    const files = [
      {
        path: skill.path,
        document: skill.document
      },
      ...skill.referenceFiles().map((file) => ({
        path: file.path,
        document: new MarkdownDocument(file)
      }))
    ]
    let links = 0
    let skillNames = 0
    for (const file of files) {
      const counts = this.#inspectFile(plugin, file, names, report)
      links += counts.links
      skillNames += counts.skillNames
    }
    return { links, skillNames }
  }

  #inspectFile(plugin, file, names, report) {
    let links = 0
    let skillNames = 0
    // Plugins install apart, so a relative link outside one breaks on install.
    for (const link of file.document.links()) {
      if (this.#isExternal(link.target)) continue
      links += 1
      if (this.#outside(plugin, file.path, link.target)) {
        report.error(
          file.path,
          `link ${link.target} resolves outside plugin ${plugin.name}`)
      }
      // Naming a skill avoids a cross-plugin path that breaks after install.
      if (PluginBoundaryCheck.#NAME.test(link.label)) {
        skillNames += 1
        if (!names.has(link.label)) {
          report.error(
            file.path,
            `unknown skill name: ${link.label}`)
        }
      }
    }
    for (const code of file.document.inlineCode()) {
      if (!PluginBoundaryCheck.#NAME.test(code)) continue
      skillNames += 1
      if (!names.has(code)) {
        report.error(file.path, `unknown skill name: ${code}`)
      }
    }
    return { links, skillNames }
  }

  #outside(plugin, filePath, target) {
    const path = this.#pathOf(target)
    if (path === '') return false
    const relativePath = relative(
      plugin.directory,
      resolve(dirname(filePath), path))
    return relativePath.startsWith('..') || isAbsolute(relativePath)
  }

  #pathOf(target) {
    const hash = target.indexOf('#')
    const path = hash === -1 ? target : target.slice(0, hash)
    return path.trim()
  }

  #isExternal(target) {
    return PluginBoundaryCheck.#EXTERNAL.some((prefix) =>
      target.startsWith(prefix))
  }
}
