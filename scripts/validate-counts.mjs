import { Cli } from './lib/cli.mjs'
import { CountsCheck } from './lib/checks/counts-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new CountsCheck(Repository.at(process.cwd())))
}
