import { Cli } from './lib/cli.mjs'
import { FileWriter } from './lib/file-writer.mjs'
import { Repository } from './lib/repository.mjs'
import { VersionBump } from './lib/version-bump.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new VersionBump(Repository.at(process.cwd()), new FileWriter()))
}
