import { Cli } from './lib/cli.mjs'
import { RoutingCheck } from './lib/checks/routing-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new RoutingCheck(
      Repository.at(process.cwd()),
      process.argv.includes('--noise')))
}
