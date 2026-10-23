import { Cli } from './lib/cli.mjs'
import { ModelRouting } from './lib/evals/model-routing.mjs'
import { ProcessRunner } from './lib/negative/process-runner.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(new ModelRouting(
    Repository.at(process.cwd()),
    process.argv.slice(2),
    new ProcessRunner(),
    process.env))
}
