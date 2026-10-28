import { Cli } from './lib/cli.mjs'
import { CheckSuite } from './lib/checks/check-suite.mjs'
import { CitationCheck } from './lib/checks/citation-check.mjs'
import { DomainCheck } from './lib/checks/domain-check.mjs'
import { NotationCheck } from './lib/checks/notation-check.mjs'
import { RaisesContractCheck } from './lib/checks/raises-contract-check.mjs'
import { SharedParagraphCheck } from './lib/checks/shared-paragraph-check.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  const repository = Repository.at(process.cwd())
  await new Cli(process).run(new CheckSuite('validate-prose', [
    new CitationCheck(repository),
    new DomainCheck(repository),
    new NotationCheck(repository),
    new RaisesContractCheck(repository),
    new SharedParagraphCheck(repository)
  ]))
}
