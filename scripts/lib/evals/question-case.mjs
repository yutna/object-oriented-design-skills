export class QuestionCase {
  static #FAMILY = 'question'
  // The tag selects the question family without inspecting the case name.
  static #TAGS = Object.freeze(['question'])
  // A question only reads and searches, so the run may not change the workspace.
  static #TOOLS = Object.freeze(['Read', 'Glob', 'Grep', 'Skill'])
  // A question has no fixture, so a search cannot stand in for an answer.
  static #SYSTEM = 'The code the user describes is not in this workspace; ' +
    'answer from the description.'
  // The judge grades substance only, so wording never decides a verdict.
  static #INSTRUCTION = 'Grade the final answer only. PASS if it makes every ' +
    'point below, in any words; FAIL if any point is missing. Points:'

  #scenario
  #name
  #graders

  constructor(scenario) {
    this.#scenario = scenario
    // The case id carries the scenario number so a report can order them.
    this.#name = `q${String(scenario.number).padStart(2, '0')}-` +
      QuestionCase.#slug(scenario.title)
    // Both roads to a skill become indicators, so one case checks routing.
    this.#graders = Object.freeze(QuestionCase.#gradersOf(scenario))
    Object.freeze(this)
  }

  get name() {
    return this.#name
  }

  get family() {
    return QuestionCase.#FAMILY
  }

  get tags() {
    return QuestionCase.#TAGS
  }

  get prompt() {
    return this.#scenario.prompt
  }

  get appendSystemPrompt() {
    return QuestionCase.#SYSTEM
  }

  get allowedTools() {
    return QuestionCase.#TOOLS
  }

  get graders() {
    return this.#graders
  }

  document(systemPrompt = QuestionCase.#SYSTEM) {
    // The eval tool reads one standalone case file, so the case is written whole.
    return {
      schema_version: '1.1',
      name: this.#name,
      tags: [...QuestionCase.#TAGS],
      execution: {
        prompt: this.#scenario.prompt,
        allowed_tools: [...QuestionCase.#TOOLS],
        append_system_prompt: systemPrompt
      },
      graders: this.#graders.map((grader) => ({ ...grader }))
    }
  }

  static #gradersOf(scenario) {
    // The judge sees only the answer, so the rubric repeats every point it needs.
    const substance = {
      name: 'substance',
      type: 'llm',
      criteria: `${QuestionCase.#INSTRUCTION}\n${scenario.mustContain}`
    }
    // A scenario names skills, so each one gets a loaded and a read indicator.
    const indicators = scenario.skills.flatMap((skill) => [
      {
        name: `loaded-${skill}`,
        type: 'tool_used',
        tool: 'Skill',
        input_match: QuestionCase.#skillInput(skill)
      },
      {
        name: `read-${skill}`,
        type: 'tool_used',
        tool: 'Read',
        input_match: QuestionCase.#fileInput(skill),
        arm: 'with-only'
      }
    ])
    return [substance, ...indicators]
  }

  static #skillInput(skill) {
    // The Skill tool may pass the plugin namespace, so that prefix is optional.
    return `"skill"\\s*:\\s*"(?:[\\w-]+:)?${skill}"`
  }

  static #fileInput(skill) {
    // An index that links by path reaches the skill through Read instead.
    return `"file_path"\\s*:\\s*"[^"]*/${skill}/SKILL\\.md"`
  }

  static #slug(title) {
    // The slug keeps a case name readable in a report and a directory name.
    return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
  }
}
