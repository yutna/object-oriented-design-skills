import test from 'node:test'
import assert from 'node:assert/strict'

import { RaisesContractCheck } from
  '../../../scripts/lib/checks/raises-contract-check.mjs'
import { MarkdownDocument } from '../../../scripts/lib/markdown-document.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'plugins/core/skills/oo-honouring-substitutability/SKILL.md'

class SkillText {
  static of(...lines) {
    return ['# Skill', '', '```text', ...lines, '```', ''].join('\n')
  }

  static withBefore(...lines) {
    return [
      '# Skill', '',
      'Before:', '',
      '```text', ...lines, '```', '',
      'After:', '',
      '```text',
      'class Slot',
      '  + reserve(patient: PatientId): void',
      '```', ''
    ].join('\n')
  }

  static inTwoFences(...fences) {
    const text = ['# Skill', '']
    for (const lines of fences) {
      text.push('```text', ...lines, '```', '')
    }
    return text.join('\n')
  }
}

class FakeSkill {
  #path
  #document
  #references

  constructor(path, text, references = []) {
    this.#path = path
    this.#document = new MarkdownDocument(new TextFile(path, text))
    this.#references = Object.freeze(references.map(
      ([referencePath, referenceText]) =>
        new TextFile(referencePath, referenceText)))
  }

  get path() {
    return this.#path
  }

  get document() {
    return this.#document
  }

  referenceFiles() {
    return this.#references
  }
}

class FakeRepository {
  #skills

  constructor(skills) {
    this.#skills = Object.freeze([...skills])
  }

  skills() {
    return this.#skills
  }
}

class CheckRun {
  static of(text) {
    return CheckRun.ofSkill(new FakeSkill(PATH, text))
  }

  static ofSkill(skill) {
    const report = new Report()
    new RaisesContractCheck(new FakeRepository([skill])).inspect(report)
    return report
  }
}

test('RaisesContractCheck rejects an undeclared error', () => {
  const report = CheckRun.of(SkillText.of(
    'interface ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    raises ChannelUnavailable',
    '',
    'class SmsChannel implements ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    raises NoMobileNumber'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 10: raises: "SmsChannel.send" raises ` +
    '"NoMobileNumber", which "ReminderChannel.send" does not declare',
    'failed: 1 error(s)'
  ])
})

test('RaisesContractCheck rejects a raise the interface omits', () => {
  const report = CheckRun.of(SkillText.of(
    'interface ReminderChannel',
    '  + send(reminder: Reminder): void',
    '',
    'class SmsChannel implements ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    raises NoMobileNumber'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 9: raises: "SmsChannel.send" raises ` +
    '"NoMobileNumber", which "ReminderChannel.send" does not declare',
    'failed: 1 error(s)'
  ])
})

test('RaisesContractCheck reads the second interface on the line', () => {
  const report = CheckRun.of(SkillText.of(
    'interface FreeSlots',
    '  + freeSlots(date: Date): ReadOnlyList<Slot>',
    '',
    'interface SlotExport',
    '  + export(): String',
    '',
    'class ClinicSlots implements FreeSlots, SlotExport',
    '  + freeSlots(date: Date): ReadOnlyList<Slot>',
    '  + export(): String',
    '    raises ExportUnavailable'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 13: raises: "ClinicSlots.export" raises ` +
    '"ExportUnavailable", which "SlotExport.export" does not declare',
    'failed: 1 error(s)'
  ])
})

test('RaisesContractCheck passes errors the interface declares', () => {
  const report = CheckRun.of(SkillText.of(
    'interface ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    raises NoMobileNumber, ChannelUnavailable',
    '',
    'class SmsChannel implements ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    raises ChannelUnavailable, NoMobileNumber'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('RaisesContractCheck skips a fence introduced by Before:', () => {
  const report = CheckRun.of(SkillText.withBefore(
    'interface ReminderChannel',
    '  + send(reminder: Reminder): void',
    '',
    'class SmsChannel implements ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    raises NoMobileNumber'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('RaisesContractCheck ignores an interface in another fence', () => {
  const report = CheckRun.of(SkillText.inTwoFences(
    [
      'interface ReminderChannel',
      '  + send(reminder: Reminder): void'
    ],
    [
      'class SmsChannel implements ReminderChannel',
      '  + send(reminder: Reminder): void',
      '    raises NoMobileNumber'
    ]))
  assert.deepEqual(report.lines(), ['ok 2 fence(s)'])
})

test('RaisesContractCheck ignores a method the interface lacks', () => {
  const report = CheckRun.of(SkillText.of(
    'interface ReminderChannel',
    '  + send(reminder: Reminder): void',
    '',
    'class SmsChannel implements ReminderChannel',
    '  + send(reminder: Reminder): void',
    '  + recover(): void',
    '    raises NoMobileNumber'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('RaisesContractCheck drops comments before it reads raises', () => {
  const report = CheckRun.of(SkillText.of(
    'interface ReminderChannel',
    '  + send(reminder: Reminder): void',
    '',
    'class SmsChannel implements ReminderChannel',
    '  + send(reminder: Reminder): void',
    '    -- raises NoMobileNumber'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('RaisesContractCheck fails when it reads no text fence', () => {
  const report = CheckRun.of('# Skill\n\nNo fences here.\n')
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 fence(s))'
  ])
})
