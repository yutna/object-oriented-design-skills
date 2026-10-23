import { Cli } from './lib/cli.mjs'
import { OopCheck } from './lib/checks/oop-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new OopCheck(Repository.at(process.cwd())))
}
