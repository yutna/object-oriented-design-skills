import { Check } from '../check.mjs'
import { RepoError } from '../errors.mjs'
import { EvalBuild } from '../evals/eval-build.mjs'
import { PluginCopy } from '../evals/plugin-copy.mjs'

export class EvalPluginCheck extends Check {
  static #SWITCHES = Object.freeze(['--dry-run'])
  static #VALUES = Object.freeze(['--arm', '--only', '--tag'])

  #repository
  #argv

  constructor(repository, argv) {
    super()
    this.#repository = repository
    this.#argv = Object.freeze([...argv])
    Object.freeze(this)
  }

  get name() {
    return 'eval-plugin'
  }

  inspect(report) {
    const options = this.#options()
    // Running a case spends a model call, which this issue does not add.
    if (!options.dryRun) {
      throw new RepoError(
        'running eval cases is not built yet; pass --dry-run', 2)
    }
    const copy = PluginCopy.of(this.#repository)
    let cases
    try {
      cases = new EvalBuild(this.#repository, copy).build(options)
    } catch (error) {
      copy.close()
      throw error
    }
    // The copy stays so the built cases can be read after the dry run.
    report.note(`copy: ${copy.path}`)
    for (const testCase of cases) {
      report.note(`${testCase.family}: ${testCase.name}`)
    }
    report.count('case(s) built', cases.length)
  }

  #options() {
    this.#rejectUnknown()
    const arm = this.#value('--arm') ?? 'none'
    if (arm !== 'none' && arm !== 'block') {
      throw new RepoError(`--arm must be block, not "${arm}"`, 2)
    }
    const onlyText = this.#value('--only')
    const only = onlyText === null
      ? []
      : onlyText.split(',').map((name) => name.trim()).filter(Boolean)
    if (onlyText !== null && only.length === 0) {
      throw new RepoError('--only needs at least one case name', 2)
    }
    return Object.freeze({
      dryRun: this.#argv.includes('--dry-run'),
      arm,
      only: Object.freeze(only),
      tag: this.#value('--tag')
    })
  }

  #rejectUnknown() {
    // A misspelt flag would otherwise build a suite the caller did not ask for.
    for (const [index, argument] of this.#argv.entries()) {
      if (EvalPluginCheck.#SWITCHES.includes(argument)) continue
      if (EvalPluginCheck.#VALUES.includes(argument)) continue
      if (index > 0 &&
        EvalPluginCheck.#VALUES.includes(this.#argv[index - 1])) continue
      throw new RepoError(`unknown argument ${argument}`, 2)
    }
  }

  #value(flag) {
    const at = this.#argv.indexOf(flag)
    if (at === -1) return null
    const value = this.#argv[at + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new RepoError(`${flag} needs a value`, 2)
    }
    return value
  }
}
