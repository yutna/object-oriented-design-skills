import { Check } from './lib/check.mjs'
import { CheckSuite } from './lib/checks/check-suite.mjs'
import { FrontmatterCheck } from './lib/checks/frontmatter-check.mjs'
import { ListingBudgetCheck } from './lib/checks/listing-budget-check.mjs'
import { ManifestCheck } from './lib/checks/manifest-check.mjs'
import { PinnedDependencyCheck } from './lib/checks/pinned-dependency-check.mjs'
import { Cli } from './lib/cli.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  class ValidateSkills extends Check {
    #cwd

    constructor(cwd) {
      super()
      this.#cwd = cwd
    }

    get name() {
      return 'validate-skills'
    }

    async inspect(report) {
      const repository = Repository.at(this.#cwd)
      await new CheckSuite('validate-skills', [
        new FrontmatterCheck(repository),
        new ManifestCheck(repository),
        new ListingBudgetCheck(repository),
        new PinnedDependencyCheck(repository)
      ]).run(report)
    }
  }

  await new Cli(process).run(new ValidateSkills(process.cwd()))
}
