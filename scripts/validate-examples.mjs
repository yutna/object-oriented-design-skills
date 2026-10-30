import { Cli } from './lib/cli.mjs'
import { ExamplesCheck } from './lib/checks/examples-check.mjs'
import { FenceSyntaxes } from './lib/examples/fence-syntaxes.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new ExamplesCheck(
      Repository.at(process.cwd()),
      new FenceSyntaxes()))
}
