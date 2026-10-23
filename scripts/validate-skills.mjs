import { Cli } from './lib/cli.mjs'
import { CheckSuite } from './lib/checks/check-suite.mjs'
import { FrontmatterCheck } from './lib/checks/frontmatter-check.mjs'
import { ListingBudgetCheck } from './lib/checks/listing-budget-check.mjs'
import { ManifestCheck } from './lib/checks/manifest-check.mjs'
import { PinnedDependencyCheck } from './lib/checks/pinned-dependency-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const repository = Repository.at(process.cwd())
  await new Cli(process).run(new CheckSuite('validate-skills', [
    new FrontmatterCheck(repository),
    new ManifestCheck(repository),
    new ListingBudgetCheck(repository),
    new PinnedDependencyCheck(repository)
  ]))
}
