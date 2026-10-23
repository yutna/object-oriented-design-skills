import { Cli } from './lib/cli.mjs'
import { EvalSummary } from './lib/evals/eval-summary.mjs'

if (import.meta.main) {
  await new Cli(process).run(new EvalSummary(process.argv[2]))
}
