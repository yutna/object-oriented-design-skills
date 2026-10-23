import { Cli } from './lib/cli.mjs'
import { ModelRouting } from './lib/evals/model-routing.mjs'
import { SelftestRunner } from './lib/evals/selftest-runner.mjs'
import { ProcessRunner } from './lib/negative/process-runner.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const argv = process.argv.slice(2)
  // A selftest answers from a fake runner, so it never reaches the model.
  const runner = argv.includes('--selftest')
    ? new SelftestRunner()
    : new ProcessRunner()
  await new Cli(process).run(new ModelRouting(
    Repository.at(process.cwd()),
    argv,
    runner,
    process.env))
}
