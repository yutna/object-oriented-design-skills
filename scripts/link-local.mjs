import { join } from 'node:path'

import { Cli } from './lib/cli.mjs'
import { FileSystem } from './lib/install/file-system.mjs'
import { LocalLinks } from './lib/install/local-links.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new LocalLinks(
      Repository.at(join(import.meta.dirname, '..')),
      process.argv.slice(2),
      new FileSystem()))
}
