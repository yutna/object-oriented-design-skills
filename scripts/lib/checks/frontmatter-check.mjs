import { Check } from '../check.mjs'

export class FrontmatterCheck extends Check {
  static #KEYS = Object.freeze([
    'description',
    'license',
    'metadata',
    'name'
  ])

  static #METADATA_KEYS = Object.freeze([
    'pack',
    'version'
  ])

  static #NAME = /^oo-[a-z0-9]+(-[a-z0-9]+)*$/

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
  }

  get name() {
    return 'frontmatter'
  }

  inspect(report) {
    const skills = this.#repository.skills()
    report.count('skill(s)', skills.length)
    const descriptions = this.#descriptionCounts(skills)
    for (const skill of skills) {
      this.#inspectSkill(skill, descriptions, report)
    }
  }

  #descriptionCounts(skills) {
    const counts = new Map()
    for (const skill of skills) {
      const description = skill.description
      if (typeof description !== 'string' || description.length === 0) {
        continue
      }
      counts.set(description, (counts.get(description) ?? 0) + 1)
    }
    return counts
  }

  #inspectSkill(skill, descriptions, report) {
    const frontmatter = skill.frontmatter
    const metadata = skill.metadata
    const description = skill.description

    // Claude Code reads only these keys; an extra key is silently ignored.
    if (!this.#sameKeys(frontmatter.keys(), FrontmatterCheck.#KEYS)) {
      report.error(
        skill.path,
        'frontmatter keys must be exactly name, description, license ' +
        'and metadata')
    }
    // The pack ships under MIT, so the declared license must say so.
    if (frontmatter.get('license') !== 'MIT') {
      report.error(skill.path, 'license must be MIT')
    }
    // Metadata is the only place the version and pack are read from.
    if (!this.#sameKeys(
      Object.keys(metadata),
      FrontmatterCheck.#METADATA_KEYS)) {
      report.error(
        skill.path,
        'metadata keys must be exactly version and pack')
    }
    // The directory is the skill's identity in the plugin listing.
    if (skill.name !== skill.directoryName) {
      report.error(skill.path, 'name must equal the directory name')
    }
    // Claude Code accepts only lower-case oo- names.
    if (typeof skill.name !== 'string' ||
      !FrontmatterCheck.#NAME.test(skill.name)) {
      report.error(
        skill.path,
        'name must match ^oo-[a-z0-9]+(-[a-z0-9]+)*$')
    }
    // Long names are truncated in the listing.
    if (typeof skill.name === 'string' && skill.name.length > 64) {
      report.error(skill.path, 'name must be at most 64 characters')
    }
    // Descriptions drive routing, so they must be present.
    if (typeof description !== 'string' || description.length === 0) {
      report.error(
        skill.path,
        'description must be a non-empty string')
    } else {
      // A description that does not open with the trigger will not route.
      if (!description.startsWith('Use when ')) {
        report.error(
          skill.path,
          'description must start with "Use when "')
      }
      // The listing cap truncates long descriptions.
      if (description.length > 160) {
        report.error(
          skill.path,
          'description must be at most 160 characters')
      }
      // Angle brackets are read as HTML by some clients.
      if (description.includes('<') || description.includes('>')) {
        report.error(
          skill.path,
          'description must not contain < or >')
      }
      // Duplicate descriptions make routing ambiguous.
      if (descriptions.get(description) > 1) {
        report.error(
          skill.path,
          'description must not match another skill')
      }
    }
    // The pack name keeps installed skills tied to this pack.
    if (metadata.pack !== 'object-oriented-design-skills') {
      report.error(
        skill.path,
        'metadata.pack must be object-oriented-design-skills')
    }
    // A stale skill version breaks the release preflight.
    if (metadata.version !== this.#repository.packageVersion) {
      report.error(
        skill.path,
        'metadata.version must equal the package version')
    }
  }

  #sameKeys(keys, expected) {
    return keys.length === expected.length &&
      expected.every((key) => keys.includes(key))
  }
}
