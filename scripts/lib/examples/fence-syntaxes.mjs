import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { RepoError } from '../errors.mjs'
import { JsonSyntax } from './json-syntax.mjs'
import { TreeSitterSyntax } from './tree-sitter-syntax.mjs'
import { TypeScriptSyntax } from './type-script-syntax.mjs'

class Grammar {
  #module
  #wasm

  constructor(module, wasm) {
    this.#module = module
    this.#wasm = wasm
    Object.freeze(this)
  }

  get module() {
    return this.#module
  }

  get wasm() {
    return this.#wasm
  }

  async syntax(loader) {
    return new TreeSitterSyntax(await loader.parser(this))
  }
}

class TypeScriptGrammar extends Grammar {
  async syntax(loader) {
    return new TypeScriptSyntax(
      new TreeSitterSyntax(await loader.parser(this)))
  }
}

class JsonGrammar {
  async syntax() {
    return new JsonSyntax()
  }
}

class GrammarLoader {
  static #module = null
  static #ready = null

  #require
  #parsers = new Map()

  constructor(requireFunction) {
    this.#require = requireFunction
    Object.freeze(this)
  }

  async parser(grammar) {
    if (!this.#parsers.has(grammar.module)) {
      this.#parsers.set(grammar.module, this.#loadParser(grammar))
    }
    return this.#parsers.get(grammar.module)
  }

  async #loadParser(grammar) {
    const { Parser, Language } = await GrammarLoader.#syntaxModule()
    const path = this.#require.resolve(
      `${grammar.module}/${grammar.wasm}`)
    // A file URL string breaks on Windows; bytes do not.
    const bytes = new Uint8Array(readFileSync(path))
    const language = await Language.load(bytes)
    const parser = new Parser()
    parser.setLanguage(language)
    return parser
  }

  static async #syntaxModule() {
    // The library and its own wasm load once, on the first grammar.
    GrammarLoader.#module ??= import('web-tree-sitter')
    const module = await GrammarLoader.#module
    GrammarLoader.#ready ??= module.Parser.init()
    await GrammarLoader.#ready
    return module
  }
}

export class FenceSyntaxes {
  static #require = createRequire(import.meta.url)
  static #JAVA = new Grammar(
    'tree-sitter-java',
    'tree-sitter-java.wasm')
  static #KOTLIN = new Grammar(
    '@tree-sitter-grammars/tree-sitter-kotlin',
    'tree-sitter-kotlin.wasm')
  static #RUBY = new Grammar(
    'tree-sitter-ruby',
    'tree-sitter-ruby.wasm')
  static #TYPESCRIPT = new TypeScriptGrammar(
    'tree-sitter-typescript',
    'tree-sitter-typescript.wasm')
  static #JAVASCRIPT = new Grammar(
    'tree-sitter-javascript',
    'tree-sitter-javascript.wasm')
  static #CSHARP = new Grammar(
    'tree-sitter-c-sharp',
    'tree-sitter-c_sharp.wasm')
  static #PYTHON = new Grammar(
    'tree-sitter-python',
    'tree-sitter-python.wasm')
  static #JSON = new JsonGrammar()

  static #GRAMMAR = Object.freeze({
    java: FenceSyntaxes.#JAVA,
    kotlin: FenceSyntaxes.#KOTLIN,
    ruby: FenceSyntaxes.#RUBY,
    typescript: FenceSyntaxes.#TYPESCRIPT,
    ts: FenceSyntaxes.#TYPESCRIPT,
    javascript: FenceSyntaxes.#JAVASCRIPT,
    js: FenceSyntaxes.#JAVASCRIPT,
    csharp: FenceSyntaxes.#CSHARP,
    python: FenceSyntaxes.#PYTHON,
    json: FenceSyntaxes.#JSON
  })

  static TAGS = Object.freeze(Object.keys(FenceSyntaxes.#GRAMMAR))

  #loader
  #syntaxes = new Map()

  constructor() {
    this.#loader = new GrammarLoader(FenceSyntaxes.#require)
    Object.freeze(this)
  }

  knows(tag) {
    return Object.hasOwn(FenceSyntaxes.#GRAMMAR, tag)
  }

  async problems(tag, source) {
    const grammar = FenceSyntaxes.#GRAMMAR[tag]
    if (grammar === undefined) {
      throw new RepoError(`unknown fence tag: ${tag}`)
    }
    const syntax = await this.#syntaxOf(tag, grammar)
    return syntax.problems(source)
  }

  #syntaxOf(tag, grammar) {
    if (!this.#syntaxes.has(tag)) {
      this.#syntaxes.set(tag, grammar.syntax(this.#loader))
    }
    return this.#syntaxes.get(tag)
  }
}
