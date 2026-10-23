import { Cli } from './lib/cli.mjs'
import { Repository } from './lib/repository.mjs'
import { RulesCheck } from './lib/checks/rules-check.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new RulesCheck(Repository.at(process.cwd())))
}
