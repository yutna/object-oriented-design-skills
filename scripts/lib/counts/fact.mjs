export class Fact {
  value(repository) {
    throw new Error('Fact.value must be overridden')
  }
}
