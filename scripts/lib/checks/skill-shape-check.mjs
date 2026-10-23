import { Check } from '../check.mjs'

export class SkillShapeCheck extends Check {
  static INDEX_HEADINGS = Object.freeze([
    'Overview',
    'How much design a task warrants',
    'Before designing',
    'The design loop',
    'How strictly a rule is meant',
    'Symptoms to skills',
    'Red flags',
    'Further reading'
  ])

  static CORE_HEADINGS = Object.freeze([
    'Overview',
    'When to use',
    'When not to use',
    'Core rules',
    'Pattern',
    'Red flags',
    'Common mistakes',
    'Related skills',
    'Further reading'
  ])

  static BACK_LINK = Object.freeze([
    '**In this pack:**',
    '[sizing](../oo-design/SKILL.md#how-much-design-a-task-warrants),',
    '[notation](../oo-design/references/notation.md),',
    '[rule strictness](../oo-design/SKILL.md#how-strictly-a-rule-is-meant).'
  ].join('\n'))

  static #PLUGIN = 'object-oriented-design-skills'
  static #INDEX = 'oo-design'
  static #LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\S/

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'skill-shape'
  }

  inspect(report) {
    const plugin = this.#repository.marketplace()
      .plugins()
      .find((candidate) => candidate.name === SkillShapeCheck.#PLUGIN)
    const skills = plugin === undefined ? [] : plugin.skills()
    report.count('skill shape(s)', skills.length)
    for (const skill of skills) {
      this.#inspectSkill(skill, report)
    }
  }

  #inspectSkill(skill, report) {
    const headings = skill.document.headings()
    const levelOne = headings.filter((heading) => heading.level === 1)
    // A skill page needs one title, not two competing ones.
    if (levelOne.length !== 1) {
      report.error(
        skill.path,
        'body must have exactly one level-one heading')
    }
    const levelTwo = headings
      .filter((heading) => heading.level === 2)
      .map((heading) => heading.text)
    if (skill.name === SkillShapeCheck.#INDEX) {
      // The index is the map of the pack, so its own list is fixed.
      if (!this.#same(levelTwo, SkillShapeCheck.INDEX_HEADINGS)) {
        report.error(
          skill.path,
          'level-two headings must equal INDEX_HEADINGS')
      }
      return
    }
    // Every other skill follows the house style in AGENTS.md.
    if (!this.#same(levelTwo, SkillShapeCheck.CORE_HEADINGS)) {
      report.error(
        skill.path,
        'level-two headings must equal CORE_HEADINGS')
    }
    // A sibling link back to the pack index keeps the skill navigable.
    if (!this.#hasBackLink(skill, headings)) {
      report.error(
        skill.path,
        'back-link block must sit between the title and Overview')
    }
    // "When not to use" needs at least two observable conditions.
    const section = skill.document.section('When not to use')
    const items = section === null
      ? 0
      : section.split('\n').filter((line) =>
        SkillShapeCheck.#LIST_ITEM.test(line)).length
    if (items < 2) {
      report.error(
        skill.path,
        'When not to use must hold at least two list items')
    }
  }

  #hasBackLink(skill, headings) {
    const title = headings.find((heading) => heading.level === 1)
    const overview = headings.find((heading) =>
      heading.level === 2 && heading.text === 'Overview')
    if (title === undefined || overview === undefined) return false
    const between = skill.document.prose()
      .split('\n')
      .slice(title.line, overview.line - 1)
      .join('\n')
      .trim()
    return between === SkillShapeCheck.BACK_LINK
  }

  #same(actual, expected) {
    return actual.length === expected.length &&
      actual.every((text, index) => text === expected[index])
  }
}
