import { Cli } from './lib/cli.mjs'
import { PatternIndexCheck } from './lib/checks/pattern-index-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new PatternIndexCheck(Repository.at(process.cwd())))
}
