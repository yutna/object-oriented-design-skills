import { Cli } from './lib/cli.mjs'
import { CheckSuite } from './lib/checks/check-suite.mjs'
import { EmptyTreeRun } from './lib/negative/empty-tree-run.mjs'
import { NegativeCases } from './lib/negative/negative-cases.mjs'
import { NegativeSuite } from './lib/negative/negative-suite.mjs'
import { ProcessRunner } from './lib/negative/process-runner.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const repository = Repository.at(process.cwd())
  const runner = new ProcessRunner()
  await new Cli(process).run(new CheckSuite('negative-test', [
    new NegativeSuite(repository.root, NegativeCases.ALL, runner),
    new EmptyTreeRun(repository.root, runner)
  ]))
}
