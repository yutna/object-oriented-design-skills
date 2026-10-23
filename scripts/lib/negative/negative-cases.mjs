import { CreateFile } from './create-file.mjs'
import { NegativeCase } from './negative-case.mjs'
import { ReplaceText } from './replace-text.mjs'

export class NegativeCases {
  static #SKILL = 'plugins/core/skills/' +
    'oo-assigning-responsibilities/SKILL.md'
  static #INDEX = 'plugins/core/skills/oo-design/SKILL.md'
  static #PLUGIN = 'plugins/core/.claude-plugin/plugin.json'
  static #SKILLS = 'scripts/validate-skills.mjs'
  static #RULES = 'scripts/validate-rules.mjs'
  static #OOP = 'scripts/validate-oop.mjs'

  static #BACK_LINK = '[rule strictness]' +
    '(../oo-design/SKILL.md#how-strictly-a-rule-is-meant).'
  static #BACK_LINK_CHANGED = '[rule strictness]' +
    '(../oo-design/SKILL.md#how-strictly-a-rule-is-meant);'
  static #BACK_LINK_BROKEN = '[rule strictness]' +
    '(../oo-design/SKILL.md#how-strictly-a-rule-is-meant-now).'
  static #DESIGN_LINK = '[oo-design](../oo-design/SKILL.md)'
  static #DESIGN_ESCAPE = '[oo-design](../../../../README.md)'
  static #UNKNOWN_LABEL =
    '[oo-no-such-skill](../oo-design/SKILL.md)'
  static #SWAPPED_FIND = '## Related skills\n\n' +
    '- [oo-design](../oo-design/SKILL.md) sizes a task and ' +
    'defines the rule\n  labels.\n\n## Further reading'
  static #SWAPPED_REPLACE = '## Further reading\n\n' +
    '- [oo-design](../oo-design/SKILL.md) sizes a task and ' +
    'defines the rule\n  labels.\n\n## Related skills'
  static #NO_LABEL_FIND = '1. Default. **'
  static #NO_LABEL_REPLACE = '1. '
  static #TWO_LABELS_REPLACE = '1. Default. Rule. **'
  static #EXCEPTION_FIND = '   The exception is a behaviour that ' +
    'would drag a database, a'
  static #EXCEPTION_REPLACE = '   An exception is a behaviour that ' +
    'would drag a database, a'
  static #OOP_FILE = 'scripts/lib/negative-fixture.mjs'
  static #OOP_TEXT = 'function broken() {}\n' +
    'export class NegativeFixture {}\n'

  static ALL = Object.freeze([
    new NegativeCase(
      'frontmatter rejects an extra key',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        'license: MIT',
        'license: MIT\ncategory: design'),
      'frontmatter keys must be exactly name, description, ' +
      'license and metadata'),
    new NegativeCase(
      'frontmatter rejects a name without oo-',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        'name: oo-',
        'name: '),
      'name must match ^oo-[a-z0-9]+(-[a-z0-9]+)*$'),
    new NegativeCase(
      'frontmatter rejects a description without Use when',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        'description: Use when ',
        'description: Covers '),
      'description must start with "Use when "'),
    new NegativeCase(
      'frontmatter rejects a wrong metadata.pack',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        '  pack: object-oriented-design-skills',
        '  pack: wrong-pack'),
      'metadata.pack must be object-oriented-design-skills'),
    new NegativeCase(
      'frontmatter rejects a wrong metadata.version',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        '  version: ',
        '  version: 9.9.9 #'),
      'metadata.version must equal the package version'),
    new NegativeCase(
      'manifest rejects a plugin version that differs',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#PLUGIN,
        '"version": "',
        '"version": "9.9.9", "ignored": "'),
      'plugin object-oriented-design-skills version 9.9.9 ' +
      'does not match package version'),
    new NegativeCase(
      'manifest rejects package.json under plugins',
      NegativeCases.#SKILLS,
      new CreateFile('plugins/core/package.json', '{}\n'),
      'package.json is not allowed under plugins'),
    new NegativeCase(
      'dependencies reject a caret range',
      NegativeCases.#SKILLS,
      new ReplaceText('package.json', '"acorn": "', '"acorn": "^'),
      'dependency acorn is not pinned to an exact version'),
    new NegativeCase(
      'shape rejects a missing When not to use',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        '## When not to use\n',
        ''),
      'When not to use must hold at least two list items'),
    new NegativeCase(
      'shape rejects two swapped core headings',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#SWAPPED_FIND,
        NegativeCases.#SWAPPED_REPLACE),
      'level-two headings must equal CORE_HEADINGS'),
    new NegativeCase(
      'shape rejects a changed back-link',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#BACK_LINK,
        NegativeCases.#BACK_LINK_CHANGED),
      'back-link block must sit between the title and Overview'),
    new NegativeCase(
      'references reject an unlinked reference file',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        '- [Object roles](references/object-roles.md)',
        '- Object roles'),
      'reference object-roles.md must be linked from Further reading'),
    new NegativeCase(
      'links reject a broken relative link',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        '[notation](../oo-design/references/notation.md)',
        '[notation](../oo-design/references/missing.md)'),
      'link target does not exist: ' +
      '../oo-design/references/missing.md'),
    new NegativeCase(
      'links reject a broken anchor',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#BACK_LINK,
        NegativeCases.#BACK_LINK_BROKEN),
      'link anchor does not exist: ' +
      '../oo-design/SKILL.md#how-strictly-a-rule-is-meant-now'),
    new NegativeCase(
      'links reject a broken reference-style definition',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#INDEX,
        '[assigning]: ../oo-assigning-responsibilities/SKILL.md',
        '[assigning]: ../oo-assigning-responsibilities/missing.md'),
      'link target does not exist: ' +
      '../oo-assigning-responsibilities/missing.md'),
    new NegativeCase(
      'plugin boundary rejects a link outside the plugin',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#DESIGN_LINK,
        NegativeCases.#DESIGN_ESCAPE),
      'link ../../../../README.md resolves outside plugin ' +
      'object-oriented-design-skills'),
    new NegativeCase(
      'plugin boundary rejects an unknown skill label',
      NegativeCases.#SKILLS,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#DESIGN_LINK,
        NegativeCases.#UNKNOWN_LABEL),
      'unknown skill name: oo-no-such-skill'),
    new NegativeCase(
      'rules reject a core rule without a label',
      NegativeCases.#RULES,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#NO_LABEL_FIND,
        NegativeCases.#NO_LABEL_REPLACE),
      'item 1 must start with Rule., Default. or Judgement.'),
    new NegativeCase(
      'rules reject a core rule with two labels',
      NegativeCases.#RULES,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#NO_LABEL_FIND,
        NegativeCases.#TWO_LABELS_REPLACE),
      'item 1 carries more than one strictness label'),
    new NegativeCase(
      'rules reject a Default without The exception',
      NegativeCases.#RULES,
      new ReplaceText(
        NegativeCases.#SKILL,
        NegativeCases.#EXCEPTION_FIND,
        NegativeCases.#EXCEPTION_REPLACE),
      'Default item 1 needs a sentence starting "The exception"'),
    new NegativeCase(
      'oop rejects a top-level function in scripts/lib',
      NegativeCases.#OOP,
      new CreateFile(NegativeCases.#OOP_FILE, NegativeCases.#OOP_TEXT),
      'top-level FunctionDeclaration is not allowed')
  ])
}
