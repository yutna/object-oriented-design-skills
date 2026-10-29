import { relative, sep } from 'node:path'

import { Check } from '../check.mjs'
import { PatternName } from './pattern-name.mjs'

export class PatternMentionCheck extends Check {
  static #INDEX_PATH =
    'plugins/core/skills/oo-design/references/pattern-index.md'
  static #ITEM = /^- \*\*(.+?)\.\*\*/

  static VOCABULARY = Object.freeze([
    'Abstract Factory',
    'Active Object',
    'Active Record',
    'Adapter',
    'Aggregate',
    'Anti-corruption Layer',
    'Application Controller',
    'Application Service',
    'Back Pressure',
    'Bounded Context',
    'Bridge',
    'Builder',
    'Bulkhead',
    'Chain of Responsibility',
    'Channel',
    'Circuit Breaker',
    'Command',
    'Command and Query Separation',
    'Command Query Responsibility Segregation',
    'Competing Consumers',
    'Composite',
    'Composition Root',
    'Conformist',
    'Consumer-driven Contract',
    'Content-based Router',
    'Context Map',
    'Correlation Identifier',
    'Customer-Supplier',
    'Data Mapper',
    'Data Transfer Object',
    'Dead-letter Channel',
    'Decorator',
    'Dependency Injection',
    'Domain Event',
    'Domain Model',
    'Domain Service',
    'Double-checked Locking',
    'Entity',
    'Event Sourcing',
    'Event-driven Consumer',
    'Facade',
    'Factory Method',
    'Fail Fast',
    'Flyweight',
    'Front Controller',
    'Guaranteed Delivery',
    'Half-sync/Half-async',
    'Humble Object',
    'Idempotent Receiver',
    'Identity Map',
    'Interpreter',
    'Iterator',
    'Lazy Load',
    'Leader/Followers',
    'Mediator',
    'Memento',
    'Message Bus',
    'Message Channel',
    'Message Router',
    'Message Translator',
    'Model-view-controller',
    'Model-view-presenter',
    'Model-view-viewmodel',
    'Monitor Object',
    'Null Object',
    'Object Mother',
    'Observer',
    'Open Host',
    'Open Host Service',
    'Optimistic Offline Lock',
    'Outbox',
    'Page Controller',
    'Passive View',
    'Pessimistic Offline Lock',
    'Polling Consumer',
    'Ports and Adapters',
    'Presentation Model',
    'Proactor',
    'Process Manager',
    'Projection',
    'Prototype',
    'Proxy',
    'Publish and Subscribe',
    'Published Language',
    'Query Object',
    'Read Model',
    'Record Set',
    'Repository',
    'Request and Reply',
    'Retry',
    'Saga',
    'Scoped Locking',
    'Separate Ways',
    'Separated Interface',
    'Service Layer',
    'Service Locator',
    'Service Stub',
    'Shared Kernel',
    'Shed Load',
    'Singleton',
    'Special Case',
    'Specification',
    'State',
    'Strangler Fig',
    'Strategy',
    'Supervising Controller',
    'Table Module',
    'Template Method',
    'Template View',
    'Test Data Builder',
    'Test Double',
    'Thread-specific Storage',
    'Timeout',
    'Tolerant Reader',
    'Transaction Script',
    'Unit of Work',
    'Value Object',
    'View Model',
    'Visitor'
  ])

  #repository

  constructor(repository) {
    super()
    this.#repository = repository
    Object.freeze(this)
  }

  get name() {
    return 'pattern-mention'
  }

  inspect(report) {
    // PatternIndexCheck reports a missing index, so this check adds no
    // second error for it.
    if (!this.#repository.exists(PatternMentionCheck.#INDEX_PATH)) return
    const indexNames = this.#indexNames()
    const files = this.#packFiles()
    for (const name of PatternMentionCheck.VOCABULARY) {
      const pattern = new PatternName(name)
      // An index item already answers the name, so it is no missing entry.
      if (indexNames.some((indexName) => pattern.equals(indexName))) {
        continue
      }
      const mention = this.#firstMention(pattern, files)
      // A vocabulary name that the pack never uses needs no index item.
      if (mention === null) continue
      report.error(
        `${mention.path}:${mention.line}`,
        `pattern index: "${name}" is named in the pack but has no entry`)
    }
    // A run that measured no vocabulary has measured nothing.
    report.count('vocabulary name(s)',
      PatternMentionCheck.VOCABULARY.length)
  }

  #indexNames() {
    const text = this.#repository.file(PatternMentionCheck.#INDEX_PATH).text
    const names = []
    for (const line of text.split('\n')) {
      const match = PatternMentionCheck.#ITEM.exec(line)
      if (match !== null) names.push(new PatternName(match[1].trim()))
    }
    // An item answers a name whatever the case of either one.
    return names
  }

  #packFiles() {
    const files = this.#repository.markdownFiles()
      .map((file) => ({ path: this.#pathOf(file), file }))
      .filter(({ path }) => path.startsWith('plugins/') &&
        path !== PatternMentionCheck.#INDEX_PATH)
    // Path order keeps the one reported place the same on every machine.
    return files.sort((left, right) => {
      if (left.path === right.path) return 0
      return left.path < right.path ? -1 : 1
    })
  }

  #firstMention(pattern, files) {
    for (const file of files) {
      const line = pattern.lineIn(file.file.text)
      if (line !== null) return { path: file.path, line }
    }
    // No file names the pattern, so there is nothing to point at.
    return null
  }

  #pathOf(file) {
    // A report reads the same on every platform.
    return relative(this.#repository.root, file.path)
      .split(sep)
      .join('/')
  }
}
