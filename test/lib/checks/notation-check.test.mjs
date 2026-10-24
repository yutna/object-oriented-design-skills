import test from 'node:test'
import assert from 'node:assert/strict'

import { NotationCheck } from '../../../scripts/lib/checks/notation-check.mjs'
import { MarkdownDocument } from '../../../scripts/lib/markdown-document.mjs'
import { Report } from '../../../scripts/lib/report.mjs'
import { TextFile } from '../../../scripts/lib/text-file.mjs'

const PATH = 'plugins/core/skills/oo-assigning-responsibilities/SKILL.md'
const REFERENCE = 'plugins/core/skills/oo-assigning-responsibilities/' +
  'references/object-roles.md'

class SkillText {
  static of(...lines) {
    return ['# Skill', '', '```text', ...lines, '```', ''].join('\n')
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
    new NotationCheck(new FakeRepository([skill])).inspect(report)
    return report
  }
}

test('NotationCheck rejects every spaced comparison operator', () => {
  const report = CheckRun.of(SkillText.of(
    'class Slot',
    '  + startsBefore(other: Slot): Boolean',
    '    if startsAt < other.startsAt then',
    '      return true',
    '    if startsAt > other.startsAt then',
    '      return true',
    '    if startsAt <= other.startsAt then',
    '      return true',
    '    if startsAt >= other.startsAt then',
    '      return true',
    '    if startsAt != other.startsAt then',
    '      return true',
    '    if startsAt <> other.startsAt then',
    '      return true',
    '    if startsAt == other.startsAt then',
    '      return true'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 6: notation: operator "<" is not defined`,
    `error ${PATH} line 8: notation: operator ">" is not defined`,
    `error ${PATH} line 10: notation: operator "<=" is not defined`,
    `error ${PATH} line 12: notation: operator ">=" is not defined`,
    `error ${PATH} line 14: notation: operator "!=" is not defined`,
    `error ${PATH} line 16: notation: operator "<>" is not defined`,
    `error ${PATH} line 18: notation: operator "==" is not defined`,
    'failed: 7 error(s)'
  ])
})

test('NotationCheck rejects infix arithmetic on a body line', () => {
  const report = CheckRun.of(SkillText.of(
    'class Appointment',
    '  + total(base: Fee, tax: Fee): Fee',
    '    subtotal := base + tax',
    '    discountValue := subtotal - discount',
    '    scaled := discountValue * factor',
    '    share := scaled / count'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 6: notation: operator "+" is not defined`,
    `error ${PATH} line 7: notation: operator "-" is not defined`,
    `error ${PATH} line 8: notation: operator "*" is not defined`,
    `error ${PATH} line 9: notation: operator "/" is not defined`,
    'failed: 4 error(s)'
  ])
})

test('NotationCheck passes markers, comments and continued signatures', () => {
  const report = CheckRun.of(SkillText.of(
    'class Appointment',
    '  - total: Fee',
    '  + static followUp(patient: PatientId, previous: Appointment,',
    '      slot: Slot): Appointment',
    '    -- the fee is base + tax; never a - b, c * d or e / f',
    '    return new Appointment(patient, slot)'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('NotationCheck rejects a for loop and a while loop', () => {
  const report = CheckRun.of(SkillText.of(
    'class Scheduler',
    '  + releaseAll(slots: List<Slot>): void',
    '    for each slot in slots',
    '      slot.release(patient)',
    '    while open',
    '      return'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 6: notation: loop "for" is not defined`,
    `error ${PATH} line 8: notation: loop "while" is not defined`,
    'failed: 2 error(s)'
  ])
})

test('NotationCheck rejects a construction without arguments', () => {
  const report = CheckRun.of(SkillText.of(
    'class Slot',
    '  + static open(startsAt: DateTime): Slot',
    '    slots := new List<Slot>',
    '    return new Slot'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 6: notation: construction needs ` +
    '"new Name(args)"',
    `error ${PATH} line 7: notation: construction needs ` +
    '"new Name(args)"',
    'failed: 2 error(s)'
  ])
})

test('NotationCheck rejects this and self', () => {
  const report = CheckRun.of(SkillText.of(
    'class Slot',
    '  + patientId(): PatientId',
    '    return this.patient',
    '  + clinicianId(): ClinicianId',
    '    return self.clinician'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 6: notation: "this" is not defined`,
    `error ${PATH} line 8: notation: "self" is not defined`,
    'failed: 2 error(s)'
  ])
})

test('NotationCheck rejects a semicolon', () => {
  const report = CheckRun.of(SkillText.of(
    'class Appointment',
    '  + cancel(): void',
    '    status := Cancelled;'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 6: notation: semicolons are not used`,
    'failed: 1 error(s)'
  ])
})

test('NotationCheck passes a comment that holds undefined words', () => {
  const report = CheckRun.of(SkillText.of(
    'class Appointment',
    '  + cancel(reason: CancellationReason): void',
    '    -- call this on self; never use a < b',
    '    status := Cancelled'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('NotationCheck passes List<Slot> and constructor declarations', () => {
  const report = CheckRun.of(SkillText.of(
    'class Clinician',
    '  + appointments(date: Date): List<Slot>',
    '  - new(slot: Slot)',
    '  + static of(slot: Slot): Clinician',
    '    return new Clinician(slot)'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('NotationCheck reads text fences in reference files', () => {
  const report = CheckRun.ofSkill(new FakeSkill(
    PATH,
    SkillText.of('class Slot'),
    [[REFERENCE, SkillText.of(
      'class Slot',
      '  + cancel(): void',
      '    status := Cancelled;')]]))
  assert.deepEqual(report.lines(), [
    `error ${REFERENCE} line 6: notation: semicolons are not used`,
    'failed: 1 error(s)'
  ])
})

test('NotationCheck fails when it reads no text fence', () => {
  const report = CheckRun.of('# Skill\n\nNo fences here.\n')
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 fence(s))'
  ])
})

test('NotationCheck rejects a raise without a raises line', () => {
  const report = CheckRun.of(SkillText.of(
    'class Slot',
    '  + reserve(patient: PatientId): void',
    '    if patient = null then',
    '      patient := patientId',
    '    else',
    '      raise SlotTaken'))
  assert.deepEqual(report.lines(), [
    `error ${PATH} line 9: notation: raise "SlotTaken" needs a ` +
    '"raises SlotTaken" line under the signature',
    'failed: 1 error(s)'
  ])
})

test('NotationCheck passes a raise named by its raises line', () => {
  const report = CheckRun.of(SkillText.of(
    'class Slot',
    '  + reserve(patient: PatientId): void',
    '    raises SlotTaken',
    '    if patient = null then',
    '      patient := patientId',
    '    else',
    '      raise SlotTaken'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('NotationCheck passes raises under a continued signature', () => {
  const report = CheckRun.of(SkillText.of(
    'class Appointment',
    '  + static followUp(patient: PatientId, previous: Appointment,',
    '      slot: Slot): Appointment',
    '    raises NotThisPatientsVisit',
    '    if previous.patient() = patient then',
    '      slot.reserve(patient)',
    '      return new Appointment(patient, slot, previous, true, 30)',
    '    else',
    '      raise NotThisPatientsVisit'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})

test('NotationCheck passes a raises line the body does not raise', () => {
  const report = CheckRun.of(SkillText.of(
    'class VisitReportBuilder',
    '  + build(): VisitReport',
    '    raises PrescriptionWithoutDiagnosis',
    '    return new VisitReport(patient, visit, clinician)'))
  assert.deepEqual(report.lines(), ['ok 1 fence(s)'])
})
