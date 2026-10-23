import { Cli } from './lib/cli.mjs'

if (import.meta.main) {
  await new Cli(process).run()
}

await new Cli(process).run()
