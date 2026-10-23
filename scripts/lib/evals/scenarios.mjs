import { Scenario } from './scenario.mjs'

export class Scenarios {
  static #HEADING = /^##[ \t]+(\d+)\.(?:[ \t]+(.+))?$/
  static #ANY_HEADING = /^#{1,2}[ \t]+\S/
  static #MUST = 'Must contain:'
  static #REACH = 'Should reach'

  static of(textFile) {
    const lines = textFile.lines()
    const scenarios = []
    let index = 0
    while (index < lines.length) {
      const heading = Scenarios.#HEADING.exec(lines[index])
      if (heading === null) {
        index += 1
        continue
      }
      let end = index + 1
      while (end < lines.length &&
        !Scenarios.#ANY_HEADING.test(lines[end])) {
        end += 1
      }
      scenarios.push(Scenarios.#scenario(
        lines.slice(index + 1, end),
        Number(heading[1]),
        (heading[2] ?? '').trim()))
      index = end
    }
    return Object.freeze(scenarios)
  }

  static #scenario(lines, number, title) {
    return new Scenario(
      number,
      title,
      Scenarios.#prompt(lines),
      Scenarios.#mustContain(lines),
      Scenarios.#skills(lines))
  }

  static #prompt(lines) {
    const start = lines.findIndex((line) => line.startsWith('>'))
    if (start === -1) return ''
    const quote = []
    for (let index = start; index < lines.length; index += 1) {
      const line = lines[index]
      if (!line.startsWith('>')) break
      // A leading "> " is Markdown; the prompt is what follows it.
      quote.push(line.replace(/^>[ \t]?/, ''))
    }
    return quote.join('\n').trim()
  }

  static #mustContain(lines) {
    const start = lines.findIndex((line) =>
      line.startsWith(Scenarios.#MUST))
    if (start === -1) return ''
    const parts = [lines[start].slice(Scenarios.#MUST.length).trim()]
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index]
      if (line.trim() === '' ||
        Scenarios.#ANY_HEADING.test(line) ||
        line.startsWith(Scenarios.#MUST) ||
        line.includes(Scenarios.#REACH)) break
      // A wrapped paragraph keeps its line breaks as written.
      parts.push(line.trim())
    }
    return parts.filter((part) => part !== '').join('\n')
  }

  static #skills(lines) {
    // A target never comes from the block-quoted prompt itself.
    const start = lines.findIndex((line) =>
      !line.startsWith('>') && line.includes(Scenarios.#REACH))
    if (start === -1) return []
    const parts = []
    for (let index = start; index < lines.length; index += 1) {
      const line = lines[index]
      if (index > start &&
        (line.trim() === '' ||
          Scenarios.#ANY_HEADING.test(line) ||
          line.startsWith(Scenarios.#MUST))) break
      parts.push(line)
    }
    const paragraph = parts.join('\n')
    const after = paragraph.slice(
      paragraph.indexOf(Scenarios.#REACH) + Scenarios.#REACH.length)
    return [...after.matchAll(/`([^`\n]+)`/g)]
      .map((match) => match[1].trim())
  }
}
