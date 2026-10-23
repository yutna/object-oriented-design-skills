import { Check } from '../check.mjs'

export class RulesCheck extends Check {
  static #PLUGIN = 'object-oriented-design-skills'
  static #INDEX = 'oo-design'
  static #LABELS = Object.freeze([
    'Rule',
    'Default',
    'Judgement'
  ])
  static #ITEM_START = /^ {0,3}(\d+)[.)]\s+/
  static #LABEL_WORD = /\b(Rule|Default|Judgement)\./g
  static #EXCEPTION = /(?:^[ \t]*|[.!?]\s+)The exception\b/m

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'rules'
  }

  inspect(report) {
    const plugin = this.#repository.marketplace()
      .plugins()
      .find((candidate) => candidate.name === RulesCheck.#PLUGIN)
    const skills = plugin === undefined
      ? []
      : plugin.skills()
        .filter((skill) => skill.name !== RulesCheck.#INDEX)
    report.count('skill(s)', skills.length)
    const labels = new Map()
    let rules = 0
    for (const skill of skills) {
      const result = this.#inspectSkill(skill, report)
      rules += result.rules
      for (const label of RulesCheck.#LABELS) {
        labels.set(
          label,
          (labels.get(label) ?? 0) + (result.labels.get(label) ?? 0))
      }
    }
    report.count('rule(s)', rules)
    report.note(this.#note(labels, rules))
  }

  #inspectSkill(skill, report) {
    const items = this.#items(skill.document.section('Core rules'))
    if (items.length === 0) {
      // A skill with no rules has nothing to teach.
      report.error(
        skill.path,
        'Core rules must hold at least one numbered item')
      return { rules: 0, labels: new Map() }
    }
    const labels = new Map()
    for (const item of items) {
      this.#inspectItem(skill, item, labels, report)
    }
    return { rules: items.length, labels }
  }

  #inspectItem(skill, item, labels, report) {
    const number = RulesCheck.#ITEM_START.exec(item[0])[1]
    const content = item.join('\n').replace(RulesCheck.#ITEM_START, '')
    const label = RulesCheck.#LABELS.find((candidate) =>
      content.startsWith(`${candidate}. `))
    if (label === undefined) {
      // A rule without a label has no strictness for a reader to follow.
      report.error(
        skill.path,
        `item ${number} must start with Rule., Default. or Judgement.`)
      return
    }
    labels.set(label, (labels.get(label) ?? 0) + 1)
    const prefix = `${label}. `
    const open = content.indexOf('**', prefix.length)
    const close = open === -1 ? -1 : content.indexOf('**', open + 2)
    if (open === -1 || close === -1) {
      // A label without a bold statement is not a rule a reader can scan.
      report.error(
        skill.path,
        `item ${number} must follow Rule., Default. or Judgement. ` +
        'with a bold statement')
      return
    }
    const labelWords = [
      ...content.slice(0, close + 2).matchAll(RulesCheck.#LABEL_WORD)
    ]
    if (labelWords.length > 1) {
      // Two labels on one rule make its strictness ambiguous.
      report.error(
        skill.path,
        `item ${number} carries more than one strictness label`)
      return
    }
    if (content.slice(prefix.length, open).trim() !== '') {
      // The label must lead straight into the bold statement it labels.
      report.error(
        skill.path,
        `item ${number} must follow Rule., Default. or Judgement. ` +
        'with a bold statement')
      return
    }
    if (label === 'Default') {
      const tail = content.slice(close + 2)
      // A Default without its own exception is an unconditional rule.
      if (!RulesCheck.#EXCEPTION.test(tail)) {
        report.error(
          skill.path,
          `Default item ${number} needs a sentence starting ` +
          '"The exception"')
      }
    }
  }

  #items(section) {
    if (section === null) return []
    const items = []
    let current = null
    for (const line of section.split('\n')) {
      if (RulesCheck.#ITEM_START.test(line)) {
        if (current !== null) items.push(current)
        current = [line]
        continue
      }
      if (current !== null) current.push(line)
    }
    if (current !== null) items.push(current)
    return items
  }

  #note(labels, total) {
    const parts = RulesCheck.#LABELS.map((label) => {
      const count = labels.get(label) ?? 0
      const percent = total === 0
        ? 0
        : Math.round((count / total) * 100)
      return `${label} ${percent}% (${count})`
    })
    return `labels: ${parts.join(', ')}`
  }
}
