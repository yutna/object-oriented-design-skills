export class RunGrade {
  static #INDICATOR_PREFIXES = Object.freeze(['loaded-', 'read-'])
  // The listing shows skills as <plugin>:<skill>; the summary wants the
  // skill name a reader can look up in this pack.
  static #PACK_PREFIX = 'object-oriented-design-skills:'
  static #SKILL_FILE = /([^/\\]+)[/\\]SKILL\.md$/

  #passed
  #state
  #skillsLoaded
  #skillFilesRead
  #failedGraders

  constructor(run, trace = '') {
    this.#passed = RunGrade.#passedFrom(run)
    this.#state = RunGrade.#stateOf(run)
    this.#failedGraders = Object.freeze(
      RunGrade.#verdicts(run)
        .filter((grader) => grader.passed !== true)
        .map((grader) => grader.name))
    const used = RunGrade.#used(trace)
    this.#skillsLoaded = Object.freeze(used.skills)
    this.#skillFilesRead = Object.freeze(used.files)
    Object.freeze(this)
  }

  get passed() {
    return this.#passed
  }

  get state() {
    return this.#state
  }

  get skillsLoaded() {
    return this.#skillsLoaded
  }

  get skillFilesRead() {
    return this.#skillFilesRead
  }

  get failedGraders() {
    return this.#failedGraders
  }

  static #verdicts(run) {
    // An indicator records what the agent did on the way, and never decides
    // whether the work was right. In a one-arm run the tool scores it anyway,
    // so the verdict is computed here by name and never taken from `passed`.
    return (run.graders ?? []).filter((grader) =>
      !RunGrade.#INDICATOR_PREFIXES.some((prefix) =>
        String(grader.name).startsWith(prefix)))
  }

  static #passedFrom(run) {
    // A run that errored produced no answer to judge, whatever its rows say.
    if (run.error) return false
    return RunGrade.#verdicts(run).every((grader) => grader.passed === true)
  }

  static #stateOf(run) {
    // A run that errored is not a sample of the answer, and one whose judge
    // gave no vote measured nothing; neither belongs to an arm.
    if (run.error) return 'errored'
    // A result row names the grader but may omit its type; a judge leaves a
    // votes array behind, while a tool grader always leaves null, so an empty
    // array is the signal that a judge ran and gave no verdict.
    const judges = RunGrade.#verdicts(run)
      .filter((grader) => RunGrade.#isJudge(grader))
    const voted = judges.every((grader) =>
      Array.isArray(grader.judgeVotes) && grader.judgeVotes.length > 0)
    return voted ? 'graded' : 'unjudged'
  }

  static #isJudge(grader) {
    return grader.type === 'llm' || Array.isArray(grader.judgeVotes)
  }

  static #used(trace) {
    const calls = []
    const results = new Map()
    for (const line of String(trace).split(/\r?\n/)) {
      if (line.trim() === '') continue
      let event
      try {
        event = JSON.parse(line)
      } catch {
        continue
      }
      const content = event?.message?.content
      if (!Array.isArray(content)) continue
      for (const part of content) {
        if (part?.type === 'tool_use') {
          calls.push(part)
        } else if (part?.type === 'tool_result') {
          // The call alone is not proof: the tool may have refused it, and a
          // refused Skill call still matches a tool_used grader.
          results.set(part.tool_use_id, part.is_error)
        }
      }
    }
    const skills = []
    const files = []
    for (const call of calls) {
      if (call.name === 'Skill') {
        if (!results.has(call.id)) continue
        if (results.get(call.id) === true) continue
        const skill = call.input?.skill
        if (typeof skill !== 'string') continue
        skills.push(RunGrade.#unprefixed(skill))
        continue
      }
      if (call.name === 'Read') {
        // Opening the skill's own file reaches the skill as a Skill call
        // does, so both roads into the same directory are recorded.
        const opened = RunGrade.#SKILL_FILE.exec(
          call.input?.file_path ?? '')
        if (opened !== null) files.push(opened[1])
      }
    }
    return { skills, files }
  }

  static #unprefixed(skill) {
    return skill.startsWith(RunGrade.#PACK_PREFIX)
      ? skill.slice(RunGrade.#PACK_PREFIX.length)
      : skill
  }
}
