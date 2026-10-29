import { Cli } from './lib/cli.mjs'
import { CheckSuite } from './lib/checks/check-suite.mjs'
import { PatternIndexCheck } from './lib/checks/pattern-index-check.mjs'
import { PatternMentionCheck } from './lib/checks/pattern-mention-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const repository = Repository.at(process.cwd())
  await new Cli(process).run(new CheckSuite('patterns', [
    new PatternIndexCheck(repository),
    new PatternMentionCheck(repository)
  ]))
}
