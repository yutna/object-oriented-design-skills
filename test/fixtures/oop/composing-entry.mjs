if (import.meta.main) {
  await new Cli(process).run(
    new OopCheck(Repository.at(process.cwd())))
}
