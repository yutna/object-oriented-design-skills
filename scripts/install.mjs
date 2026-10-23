import { homedir } from 'node:os'
import { join } from 'node:path'

import { Cli } from './lib/cli.mjs'
import { FileSystem } from './lib/install/file-system.mjs'
import { Installer } from './lib/install/installer.mjs'
import { Repository } from './lib/repository.mjs'

if (import.meta.main) {
  await new Cli(process).run(
    new Installer(
      Repository.at(join(import.meta.dirname, '..')),
      homedir(),
      process.argv.slice(2),
      new FileSystem()))
}
