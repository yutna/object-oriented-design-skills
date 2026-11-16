import { Cli } from './lib/cli.mjs'
import { Clock } from './lib/evals/clock.mjs'
import { QueueLock } from './lib/evals/queue-lock.mjs'
import { QuotaMeter } from './lib/evals/quota-meter.mjs'
import { QueueRun } from './lib/evals/queue-run.mjs'
import { ProcessRunner } from './lib/negative/process-runner.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const repository = Repository.at(process.cwd())
  const runner = new ProcessRunner()
  const clock = new Clock()
  await new Cli(process).run(new QueueRun(
    repository,
    process.argv.slice(2),
    new QuotaMeter(runner),
    runner,
    clock,
    new QueueLock(repository, runner, process, clock)))
}
