export class Mutation {
  apply(root) {
    throw new Error('Mutation.apply must be overridden')
  }

  equals(other) {
    return this === other
  }
}
