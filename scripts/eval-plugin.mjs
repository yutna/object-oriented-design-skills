import { Cli } from './lib/cli.mjs'
import { EvalPluginCheck } from './lib/checks/eval-plugin-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new EvalPluginCheck(Repository.at(process.cwd()), process.argv.slice(2)))
}
