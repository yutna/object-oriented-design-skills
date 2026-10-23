import { Cli } from './lib/cli.mjs'
import { CheckSuite } from './lib/checks/check-suite.mjs'
import { RoutingCheck } from './lib/checks/routing-check.mjs'
import { ScenariosCheck } from './lib/checks/scenarios-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const repository = Repository.at(process.cwd())
  await new Cli(process).run(new CheckSuite('eval-routing', [
    new RoutingCheck(repository, process.argv.includes('--noise')),
    new ScenariosCheck(repository)
  ]))
}
