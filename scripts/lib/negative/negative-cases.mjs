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
  static #EVAL = 'scripts/eval-routing.mjs'
  static #PROSE = 'scripts/validate-prose.mjs'
  static #COUNTS = 'scripts/validate-counts.mjs'
  static #README = 'evals/README.md'
  static #ROUTING = 'evals/routing-cases.md'
  static #SCENARIOS = 'evals/scenarios.md'
  static #TASK = 'evals/tasks/t01-check-before-booking.yaml'

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
  static #UNKNOWN_ROUTING_FIND =
    'which class owns the appointment reminder -> ' +
    'oo-assigning-responsibilities'
  static #UNKNOWN_ROUTING_REPLACE =
    'which class owns the appointment reminder -> oo-no-such-skill'
  static #ZERO_ROUTING_FIND =
    'we need to size this appointment design work -> oo-design'
  static #ZERO_ROUTING_REPLACE =
    'a clinic appointment slot -> oo-design'
  static #SCENARIO_GAP_FIND =
    '## 3. A one-line fix that needs no redesign'
  static #SCENARIO_GAP_REPLACE =
    '## 4. A one-line fix that needs no redesign'
  static #SCENARIO_UNKNOWN_FIND =
    'Should reach `oo-assigning-responsibilities`.'
  static #SCENARIO_UNKNOWN_REPLACE =
    'Should reach `oo-no-such-skill`.'
  static #SCENARIO_DESIGN_FIND = 'Should reach `oo-design`.'
  static #SHARED_COPY =
    "The pack is design rules for codebases written in an object-oriented\n" +
    "style, not universal advice. A project's own written conventions " +
    "win over\nthe pack. Follow the idiom of the module being changed. " +
    "This skill sizes\nthe task and names the skill that fits."
  static #COUNT_FIND = 'carries one of three labels'
  static #COUNT_REPLACE = 'carries one of four labels'
  static #SCENARIO_CLAIM_FIND = '`scenarios.md` holds 23 scenarios'
  static #SCENARIO_CLAIM_REPLACE = '`scenarios.md` contains 8 scenarios'
  static #TASK_TAGS_FIND = 'tags: [task, smoke]'
  static #TASK_TAGS_REPLACE = 'tags: [smoke]'
  static #TASK_SKILL_FIND = 'oo-assigning-responsibilities"\''
  static #TASK_SKILL_REPLACE = 'oo-no-such-skill"\''
  static #NOTATION_SKILL = 'plugins/core/skills/' +
    'oo-constructing-valid-objects/SKILL.md'
  static #NOTATION_FIND = '    if previous.patient() = patient then'
  static #NOTATION_REPLACE = '    if previous.patient() != patient then'
  static #COLLECTION_SKILL = 'plugins/core/skills/' +
    'oo-encapsulating-state-and-behaviour/SKILL.md'
  static #RAISES_FIND = '    raises SlotsOverlap\n'
  static #RAISES_REPLACE = ''
  static #ARITHMETIC_SKILL = 'plugins/core/skills/' +
    'oo-modeling-values-and-entities/SKILL.md'
  static #ARITHMETIC_FIND = '    return new Referral(patient, clinician)'
  static #ARITHMETIC_REPLACE = '    return new Referral(patient + clinician)'

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
      'top-level FunctionDeclaration is not allowed'),
    new NegativeCase(
      'oop rejects a class inside the main guard',
      NegativeCases.#OOP,
      new ReplaceText(
        NegativeCases.#OOP,
        'if (import.meta.main) {\n',
        'if (import.meta.main) {\n  class GuardClass {}\n'),
      'the main guard may only compose objects, not declare ' +
      'ClassDeclaration'),
    new NegativeCase(
      'routing rejects an unknown expected skill',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#ROUTING,
        NegativeCases.#UNKNOWN_ROUTING_FIND,
        NegativeCases.#UNKNOWN_ROUTING_REPLACE),
      'unknown expected skill: oo-no-such-skill'),
    new NegativeCase(
      'routing rejects a symptom with no shared term',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#ROUTING,
        NegativeCases.#ZERO_ROUTING_FIND,
        NegativeCases.#ZERO_ROUTING_REPLACE),
      'expected oo-design in the top 3 with a score above zero'),
    new NegativeCase(
      'scenarios reject a gap in numbering',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#SCENARIOS,
        NegativeCases.#SCENARIO_GAP_FIND,
        NegativeCases.#SCENARIO_GAP_REPLACE),
      'scenario numbering must start at 1 and run without gaps ' +
      'or repeats'),
    new NegativeCase(
      'scenarios reject an unknown skill',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#SCENARIOS,
        NegativeCases.#SCENARIO_UNKNOWN_FIND,
        NegativeCases.#SCENARIO_UNKNOWN_REPLACE),
      'scenario 1 names unknown skill: oo-no-such-skill'),
    new NegativeCase(
      'prose rejects a citation in a skill',
      NegativeCases.#PROSE,
      new ReplaceText(
        NegativeCases.#SKILL,
        '## Red flags\n\nPlaces to look',
        '## Red flags\n\nFowler et al. wrote about this.\n\n' +
        'Places to look'),
      'citation mark: et al.'),
    new NegativeCase(
      'prose rejects a stock example in a pattern fence',
      NegativeCases.#PROSE,
      new ReplaceText(
        NegativeCases.#SKILL,
        'class Slot\n  - patient: PatientId?',
        'class Customer\n  - patient: PatientId?'),
      'stock example word: customer'),
    new NegativeCase(
      'prose rejects a shared paragraph',
      NegativeCases.#PROSE,
      new ReplaceText(
        NegativeCases.#SKILL,
        '## Overview\n\nEvery behaviour needs an owner.',
        '## Overview\n\n' + NegativeCases.#SHARED_COPY +
        '\n\nEvery behaviour needs an owner.'),
      'paragraph is shared by oo-design and ' +
      'oo-assigning-responsibilities'),
    new NegativeCase(
      'prose rejects syntax the notation does not define',
      NegativeCases.#PROSE,
      new ReplaceText(
        NegativeCases.#NOTATION_SKILL,
        NegativeCases.#NOTATION_FIND,
        NegativeCases.#NOTATION_REPLACE),
      'notation: operator "!=" is not defined'),
    new NegativeCase(
      'prose rejects a raise without a raises line',
      NegativeCases.#PROSE,
      new ReplaceText(
        NegativeCases.#COLLECTION_SKILL,
        NegativeCases.#RAISES_FIND,
        NegativeCases.#RAISES_REPLACE),
      'notation: raise "SlotsOverlap" needs a "raises SlotsOverlap" ' +
      'line under the signature'),
    new NegativeCase(
      'prose rejects infix arithmetic in a fence body',
      NegativeCases.#PROSE,
      new ReplaceText(
        NegativeCases.#ARITHMETIC_SKILL,
        NegativeCases.#ARITHMETIC_FIND,
        NegativeCases.#ARITHMETIC_REPLACE),
      'notation: operator "+" is not defined'),
    new NegativeCase(
      'counts rejects a stale label count',
      NegativeCases.#COUNTS,
      new ReplaceText(
        NegativeCases.#INDEX,
        NegativeCases.#COUNT_FIND,
        NegativeCases.#COUNT_REPLACE),
      'stated four but the fact is 3'),
    new NegativeCase(
      'counts rejects a missing scenario claim',
      NegativeCases.#COUNTS,
      new ReplaceText(
        NegativeCases.#README,
        NegativeCases.#SCENARIO_CLAIM_FIND,
        NegativeCases.#SCENARIO_CLAIM_REPLACE),
      'claim not found: /holds (\\S+) scenarios/'),
    new NegativeCase(
      'eval cases reject tags without a family',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#TASK,
        NegativeCases.#TASK_TAGS_FIND,
        NegativeCases.#TASK_TAGS_REPLACE),
      'tags must hold exactly one family tag of task, restraint ' +
      'or precedence'),
    new NegativeCase(
      'eval cases reject an unknown input_match skill',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#TASK,
        NegativeCases.#TASK_SKILL_FIND,
        NegativeCases.#TASK_SKILL_REPLACE),
      'unknown skill in input_match: oo-no-such-skill'),
    new NegativeCase(
      'coverage rejects a skill with no scenario',
      NegativeCases.#EVAL,
      new ReplaceText(
        NegativeCases.#SCENARIOS,
        NegativeCases.#SCENARIO_DESIGN_FIND,
        ''),
      'oo-design has no scenario')
  ])
}
