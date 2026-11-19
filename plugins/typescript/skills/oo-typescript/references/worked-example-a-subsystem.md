# A worked example of a subsystem

- [The subsystem's job](#the-subsystems-job)
- [The order it is built in](#the-order-it-is-built-in)
- [The domain](#the-domain)
- [The use cases and the ports](#the-use-cases-and-the-ports)
- [The database adapter](#the-database-adapter)
- [The HTTP adapter](#the-http-adapter)
- [The composition root](#the-composition-root)
- [The end state](#the-end-state)

## The subsystem's job

The clinic says:

> After a visit, a clinician may issue the patient an absence note for
> work or school. A note can be amended, which makes a new version, or
> cancelled. A visit has at most one live note.

The subsystem issues, amends and cancels one note. The visit is a value
the note names; no fence books, moves or cancels an appointment.

The example uses no framework. With none, every constructor call, every
turned error and every SQL statement sits in a file the reader can
follow, and no convention decides anything behind the code. A framework
would build the use cases, read the request and choose the reply; the
framework skills in this pack show what each one adds to this subsystem.

The subsystem has one way in and one store, so it keeps its layers close
around the domain (`oo-layering-the-system` rule 5). It still keeps them
apart, because the store and the wire change for reasons the note does
not.

## The order it is built in

The subsystem is built from the domain outward:

1. the values and the one entity;
2. the ports the use cases need, and the use cases;
3. the database adapter behind the note port;
4. the HTTP adapter at the other end;
5. the composition root that builds every adapter once.

Each part is written after the inner types it names: the domain file
imports nothing, the application file imports the domain, the adapters
import both, and the root imports all of them. That is
`oo-layering-the-system` rule 1. A part written last cannot pull the
domain outward, because the compile fails at the edge.

## The domain

One file holds the values, the errors, the note and the note port. It
imports nothing.

`src/domain/absence-note.ts`:

```typescript
export class AbsenceNoteRefused extends Error {}
export class AbsenceNoteAlreadyCancelled extends AbsenceNoteRefused {}
export class AbsenceNoteAlreadyLive extends AbsenceNoteRefused {
  constructor(readonly live: AbsenceNoteId) {
    super(`the visit already has the live note ${live}`)
  }
}
export class AbsenceNoteNotFound extends AbsenceNoteRefused {}
export class AbsenceNoteUnreadable extends Error {}
export class StaleAbsenceNote extends AbsenceNoteRefused {}

export class MalformedIdentifier extends Error {}
export class MalformedCalendarDay extends Error {}
export class AbsencePeriodReversed extends Error {}

declare const identifierBrand: unique symbol

type Identifier<Kind> = string & { readonly [identifierBrand]: Kind }

export type PatientId = Identifier<'patient'>
export type ClinicianId = Identifier<'clinician'>
export type VisitId = Identifier<'visit'>
export type AbsenceNoteId = Identifier<'absence-note'>
export type CalendarDay = Identifier<'calendar-day'>

function asIdentifier<Kind>(text: string, kind: string): Identifier<Kind> {
  if (text.trim() === '') throw new MalformedIdentifier(`${kind} is blank`)
  return text as Identifier<Kind>
}

export function asPatientId(text: string): PatientId {
  return asIdentifier<'patient'>(text, 'patient')
}

export function asClinicianId(text: string): ClinicianId {
  return asIdentifier<'clinician'>(text, 'clinician')
}

export function asVisitId(text: string): VisitId {
  return asIdentifier<'visit'>(text, 'visit')
}

export function asAbsenceNoteId(text: string): AbsenceNoteId {
  return asIdentifier<'absence-note'>(text, 'absence-note')
}

export function asCalendarDay(text: string): CalendarDay {
  const parsed = new Date(`${text}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== text) {
    throw new MalformedCalendarDay(`${text} is not a calendar day`)
  }
  return text as CalendarDay
}

export function calendarDayOf(date: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const value = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? ''
  return asCalendarDay(`${value('year')}-${value('month')}-${value('day')}`)
}

export class AbsencePeriod {
  readonly firstDay: CalendarDay
  readonly lastDay: CalendarDay

  constructor(firstDay: CalendarDay, lastDay: CalendarDay) {
    if (lastDay < firstDay) {
      throw new AbsencePeriodReversed(`${lastDay} is before ${firstDay}`)
    }
    this.firstDay = firstDay
    this.lastDay = lastDay
    Object.freeze(this)
  }
}

export type NotePurpose = 'work' | 'school'

export class AbsenceNote {
  #purpose: NotePurpose
  #period: AbsencePeriod
  #version: number
  #cancelled: boolean

  private constructor(
    readonly id: AbsenceNoteId,
    readonly visit: VisitId,
    readonly patient: PatientId,
    readonly clinician: ClinicianId,
    readonly issuedOn: CalendarDay,
    purpose: NotePurpose,
    period: AbsencePeriod,
    version: number,
    cancelled: boolean
  ) {
    this.#purpose = purpose
    this.#period = period
    this.#version = version
    this.#cancelled = cancelled
  }

  static issue(
    id: AbsenceNoteId,
    visit: VisitId,
    patient: PatientId,
    clinician: ClinicianId,
    purpose: NotePurpose,
    period: AbsencePeriod,
    issuedOn: CalendarDay
  ): AbsenceNote {
    return new AbsenceNote(id, visit, patient, clinician, issuedOn, purpose,
      period, 1, false)
  }

  static restore(
    id: AbsenceNoteId,
    visit: VisitId,
    patient: PatientId,
    clinician: ClinicianId,
    purpose: NotePurpose,
    period: AbsencePeriod,
    issuedOn: CalendarDay,
    version: number,
    cancelled: boolean
  ): AbsenceNote {
    return new AbsenceNote(id, visit, patient, clinician, issuedOn, purpose,
      period, version, cancelled)
  }

  get purpose(): NotePurpose { return this.#purpose }
  get period(): AbsencePeriod { return this.#period }
  get version(): number { return this.#version }
  get cancelled(): boolean { return this.#cancelled }

  amend(purpose: NotePurpose, period: AbsencePeriod): void {
    if (this.#cancelled) {
      throw new AbsenceNoteAlreadyCancelled(`note ${this.id} is cancelled`)
    }
    this.#purpose = purpose
    this.#period = period
    this.#version += 1
  }

  cancel(): void {
    if (this.#cancelled) {
      throw new AbsenceNoteAlreadyCancelled(`note ${this.id} is cancelled`)
    }
    this.#cancelled = true
    this.#version += 1
  }
}

export interface AbsenceNotes {
  // raises AbsenceNoteAlreadyLive
  add(note: AbsenceNote): void
  // raises AbsenceNoteNotFound, AbsenceNoteUnreadable
  find(id: AbsenceNoteId): AbsenceNote
  // raises StaleAbsenceNote
  save(note: AbsenceNote): void
}
```

The clinic's words are the code's words: a note is issued, amended or
cancelled, and it is live until it is cancelled.

`PatientId`, `ClinicianId`, `VisitId`, `AbsenceNoteId` and `CalendarDay`
are all strings at the wire. `asIdentifier` gives each its own brand and
checks the text once, so a patient identifier cannot stand where a visit
identifier is expected (`oo-typescript` rule 1). The brand is one
`unique symbol` whose member carries the kind; the skill's Pattern uses
one symbol per identifier, and this file uses one for the same guard in
fewer lines. `VisitId` is the visit's identity the pack's other examples
use as a type; here it takes the same brand and factory as the other
identifiers.

`AbsenceNote` is an entity: two notes for one visit are two notes with a
history, so `issue` assigns an identity and no method changes it
(`oo-modeling-values-and-entities` rules 1 and 4). `AbsencePeriod` is a
value: two equal periods are interchangeable, and `Object.freeze` keeps
its fields read only (`oo-modeling-values-and-entities` rule 2).
`CalendarDay` is a branded primitive whose factory checks the calendar
rule once, and the `AbsencePeriod` constructor refuses a last day before
its first, where a raw pair of days would repeat the check
(`oo-modeling-values-and-entities` rule 5).

`AbsenceNote` keeps `#purpose`, `#period`, `#version` and `#cancelled`
in `#private` fields; after construction, `amend` and `cancel` are the
only methods that write them (`oo-typescript` rule 2). The identity, the
visit, the patient, the clinician and the issue day are read-only
public fields, because no action changes them. There is no setter:
`amend` and `cancel` are named for the clinic's actions
(`oo-encapsulating-state-and-behaviour` rule 2,
`oo-designing-aggregates` rule 2).

A cancelled note stays cancelled: `amend` and `cancel` both raise
`AbsenceNoteAlreadyCancelled`, and no method reopens it
(`oo-encapsulating-state-and-behaviour` rule 1,
`oo-modeling-lifecycles` rule 4). A live note accepts both transitions
and a cancelled one refuses both (`oo-modeling-lifecycles` rule 2). The
note holds `VisitId`, `PatientId` and `ClinicianId`, never the visit, the
patient or the clinician (`oo-designing-aggregates` rule 3), and it is
one aggregate root: its period, purpose, version and cancellation state
change together, with no other aggregate inside
(`oo-designing-aggregates` rule 1).

`amend` and `cancel` check `#cancelled` and then change the note. In one
process, nothing runs between the two: `DatabaseSync` is synchronous and
no method here awaits. When a second process shares the database, the
write lock in the database adapter makes it wait for the first to
commit; its `find` then reads the cancelled note, and `amend` or
`cancel` raises `AbsenceNoteAlreadyCancelled`. A wait longer than the
five-second busy timeout is a database fault, which no port declares and
the HTTP adapter answers with 500.

`issue` sets every field from its parameters before a method reads one;
`restore` does the same for a stored note, and only the database adapter
calls it. `amend` and `cancel` change the note once and send no message.

What `amend` and `cancel` change is one `AbsenceNote` in memory. The
database adapter stores it whole under its `AbsenceNoteId`, in the SQLite
file the composition root opens, in the transaction `UnitOfWork.run`
opens. This fence stores nothing.

## The use cases and the ports

`src/application/absence-notes.ts`:

```typescript
import {
  AbsenceNote,
  calendarDayOf,
  type AbsenceNoteId,
  type AbsenceNotes,
  type AbsencePeriod,
  type ClinicianId,
  type NotePurpose,
  type PatientId,
  type VisitId
} from '../domain/absence-note.js'

export interface Clock {
  now(): Date
}

export interface AbsenceNoteIds {
  next(): AbsenceNoteId
}

export interface UnitOfWork {
  run(work: () => void): void
}

export class IssueAbsenceNote {
  readonly #notes: AbsenceNotes
  readonly #ids: AbsenceNoteIds
  readonly #clock: Clock
  readonly #timeZone: string
  readonly #unitOfWork: UnitOfWork

  constructor(notes: AbsenceNotes, ids: AbsenceNoteIds, clock: Clock,
    timeZone: string, unitOfWork: UnitOfWork) {
    this.#notes = notes
    this.#ids = ids
    this.#clock = clock
    this.#timeZone = timeZone
    this.#unitOfWork = unitOfWork
  }

  run(visit: VisitId, patient: PatientId, clinician: ClinicianId,
    purpose: NotePurpose, period: AbsencePeriod): AbsenceNoteId {
    const id = this.#ids.next()
    this.#unitOfWork.run(() => {
      const note = AbsenceNote.issue(id, visit, patient, clinician,
        purpose, period,
        calendarDayOf(this.#clock.now(), this.#timeZone))
      this.#notes.add(note)
    })
    return id
  }
}

export class AmendAbsenceNote {
  readonly #notes: AbsenceNotes
  readonly #unitOfWork: UnitOfWork

  constructor(notes: AbsenceNotes, unitOfWork: UnitOfWork) {
    this.#notes = notes
    this.#unitOfWork = unitOfWork
  }

  run(id: AbsenceNoteId, purpose: NotePurpose,
    period: AbsencePeriod): void {
    this.#unitOfWork.run(() => {
      const note = this.#notes.find(id)
      note.amend(purpose, period)
      this.#notes.save(note)
    })
  }
}

export class CancelAbsenceNote {
  readonly #notes: AbsenceNotes
  readonly #unitOfWork: UnitOfWork

  constructor(notes: AbsenceNotes, unitOfWork: UnitOfWork) {
    this.#notes = notes
    this.#unitOfWork = unitOfWork
  }

  run(id: AbsenceNoteId): void {
    this.#unitOfWork.run(() => {
      const note = this.#notes.find(id)
      note.cancel()
      this.#notes.save(note)
    })
  }
}
```

`AbsenceNotes` is the port the domain-side code sends: `add`, `find` and
`save`, with no method that writes one field by identity
(`oo-designing-repositories` rule 1). It sits in the domain file, and no
signature names a database, a row or a query
(`oo-inverting-dependencies` rule 1). `Clock`, `AbsenceNoteIds` and
`UnitOfWork` are the other ports; each is a promise its implementations
share. `Clock` is the port `oo-inverting-dependencies` shows for the
current time, with a JavaScript `Date` as this language's moment;
`Clock.now` and `AbsenceNoteIds.next` raise no refusal.

The port declares every error its implementation raises:

- `add` raises `AbsenceNoteAlreadyLive`, naming the live note the visit
  already has.
- `find` raises `AbsenceNoteNotFound` for an identity no note has, and
  `AbsenceNoteUnreadable` for a stored row that does not satisfy the
  values.
- `save` raises `StaleAbsenceNote` when the stored note has a version
  other than the one before the note it is given; a database error is a
  fault the port does not declare.

`IssueAbsenceNote.run` opens the transaction, asks the clock once,
builds one note and sends `add`; it returns the new identity. It does
not look for a live note first: the index in the database adapter is the
only refusal, and `run` lets `AbsenceNoteAlreadyLive` pass. The HTTP
adapter answers 409 with the live note's identity, so the caller can
send amend or cancel to that note. The identity comes from a read the
adapter makes after the index refuses, not from a check before the
insert.

`IssueAbsenceNote` dates the note in the clinic's day: `calendarDayOf`
reads the `year`, `month` and `day` parts `Intl.DateTimeFormat` returns
in the zone the caller of `startAbsenceNoteServer` passes, and
`asCalendarDay` checks the text. A zone name the platform does not know
makes `Intl.DateTimeFormat` throw a `RangeError` at the first issue,
which no port declares, as the ports declare no database fault.

`AmendAbsenceNote.run` loads the note, sends `amend` to its root and
stores the whole note (`oo-designing-repositories` rule 6). The load,
the change and the save are one transaction (`oo-placing-domain-logic`
rule 2). `CancelAbsenceNote.run` does the same with `cancel`. Neither
decides a clinic rule; `AbsenceNoteAlreadyCancelled` comes from the note
and passes to the caller. A missing note makes `find` raise
`AbsenceNoteNotFound`, and the HTTP adapter answers 404; a row that
cannot be read raises `AbsenceNoteUnreadable`, and the HTTP adapter
answers 500. `save` raises `StaleAbsenceNote` when the row has a version
other than the one before the note it is given; no use case shown
reaches it, because `AmendAbsenceNote.run` and `CancelAbsenceNote.run`
load each note after their transaction opens, so the copy each saves is
the row it read.

`UnitOfWork.run` is the port that opens and ends the transaction
without naming SQLite (`oo-placing-domain-logic` rule 2). It raises no
error of its own: the work's refusal and a database fault pass through
it. Every use case receives its ports through its constructor
(`oo-typescript` rule 6). `IssueAbsenceNote.run` coordinates,
`AbsenceNote.amend` decides, and the HTTP adapter's `AbsenceNoteHttp.serve`
translates the request and the reply (`oo-layering-the-system` rule 2).

What each write `run` stores is one whole note, under its
`AbsenceNoteId`, in the SQLite file the composition root opens, in the
transaction `UnitOfWork.run` opens. `IssueAbsenceNote.run` stores a
new note; the other two store a changed one.

## The database adapter

`src/adapters/sqlite-absence-notes.ts`:

```typescript
import { DatabaseSync, type StatementSync } from 'node:sqlite'

import type { UnitOfWork } from '../application/absence-notes.js'
import {
  AbsenceNote,
  AbsenceNoteAlreadyLive,
  AbsenceNoteNotFound,
  AbsenceNoteUnreadable,
  AbsencePeriod,
  StaleAbsenceNote,
  asAbsenceNoteId,
  asCalendarDay,
  asClinicianId,
  asPatientId,
  asVisitId,
  type AbsenceNoteId,
  type AbsenceNotes,
  type NotePurpose
} from '../domain/absence-note.js'

interface AbsenceNoteRow {
  id: string
  visit_id: string
  patient_id: string
  clinician_id: string
  purpose: string
  first_day: string
  last_day: string
  issued_on: string
  version: number
  cancelled: number
}

function toPurpose(text: string): NotePurpose {
  if (text === 'work' || text === 'school') return text
  throw new Error(`${text} is not a note purpose`)
}

export class SqliteUnitOfWork implements UnitOfWork {
  readonly #database: DatabaseSync

  constructor(database: DatabaseSync) {
    this.#database = database
  }

  run(work: () => void): void {
    this.#database.exec('BEGIN IMMEDIATE')
    try {
      work()
      this.#database.exec('COMMIT')
    } catch (error) {
      if (this.#database.isTransaction) this.#database.exec('ROLLBACK')
      throw error
    }
  }
}

export class SqliteAbsenceNotes implements AbsenceNotes {
  static #SCHEMA = `
    CREATE TABLE IF NOT EXISTS absence_notes (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      clinician_id TEXT NOT NULL,
      purpose TEXT NOT NULL,
      first_day TEXT NOT NULL,
      last_day TEXT NOT NULL,
      issued_on TEXT NOT NULL,
      version INTEGER NOT NULL,
      cancelled INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS one_live_note_per_visit
      ON absence_notes (visit_id)
      WHERE cancelled = 0;
  `

  readonly #insert: StatementSync
  readonly #select: StatementSync
  readonly #selectLive: StatementSync
  readonly #update: StatementSync

  constructor(database: DatabaseSync) {
    database.exec(SqliteAbsenceNotes.#SCHEMA)
    this.#insert = database.prepare(`
      INSERT INTO absence_notes (
        id, visit_id, patient_id, clinician_id, purpose,
        first_day, last_day, issued_on, version, cancelled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    this.#select = database.prepare(`
      SELECT id, visit_id, patient_id, clinician_id, purpose,
        first_day, last_day, issued_on, version, cancelled
      FROM absence_notes
      WHERE id = ?
    `)
    this.#selectLive = database.prepare(`
      SELECT id FROM absence_notes
      WHERE visit_id = ? AND cancelled = 0
    `)
    this.#update = database.prepare(`
      UPDATE absence_notes
      SET purpose = ?, first_day = ?, last_day = ?, version = ?,
        cancelled = ?
      WHERE id = ? AND version = ?
    `)
  }

  add(note: AbsenceNote): void {
    try {
      this.#insert.run(
        note.id, note.visit, note.patient, note.clinician, note.purpose,
        note.period.firstDay, note.period.lastDay, note.issuedOn,
        note.version, note.cancelled ? 1 : 0
      )
    } catch (error) {
      if (!this.#isUniqueRefusal(error)) throw error
      const live = this.#selectLive.get(note.visit) as
        { id: string } | undefined
      if (live === undefined) throw error
      throw new AbsenceNoteAlreadyLive(asAbsenceNoteId(live.id))
    }
  }

  find(id: AbsenceNoteId): AbsenceNote {
    const row = this.#select.get(id) as AbsenceNoteRow | undefined
    if (row === undefined) {
      throw new AbsenceNoteNotFound(`note ${id} does not exist`)
    }
    try {
      if (!Number.isInteger(row.version) || row.version < 1) {
        throw new Error('the stored version is not a note version')
      }
      return AbsenceNote.restore(
        asAbsenceNoteId(row.id),
        asVisitId(row.visit_id),
        asPatientId(row.patient_id),
        asClinicianId(row.clinician_id),
        toPurpose(row.purpose),
        new AbsencePeriod(
          asCalendarDay(row.first_day),
          asCalendarDay(row.last_day)
        ),
        asCalendarDay(row.issued_on),
        row.version,
        row.cancelled === 1
      )
    } catch {
      throw new AbsenceNoteUnreadable(`note ${id} is unreadable`)
    }
  }

  save(note: AbsenceNote): void {
    const expected = note.version - 1
    const result = this.#update.run(
      note.purpose, note.period.firstDay, note.period.lastDay,
      note.version, note.cancelled ? 1 : 0, note.id, expected
    )
    if (Number(result.changes) === 0) {
      throw new StaleAbsenceNote(`note ${note.id} has changed`)
    }
  }

  #isUniqueRefusal(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const candidate = error as Error & { errcode?: number }
    return candidate.errcode === 2067
  }
}
```

`node:sqlite` is a release candidate in Node 24, and its `DatabaseSync`
executes synchronously. The port is what lets another adapter replace
it: no domain or application file names the module, so a different store
is one new class and one line in the composition root.

`SqliteAbsenceNotes` is the only class that names a table, a column or
`errcode`; `SqliteUnitOfWork` names `DatabaseSync` only to run the
transaction, and the row shape and the mapping stay in the notes class
(`oo-hiding-implementation` rule 3, `oo-taming-persistence` rule 2). It
rebuilds a note through `AbsenceNote.restore`, so no field is set from
outside the class (`oo-designing-repositories` rule 2).

The schema holds one row per note and a partial unique index over
`visit_id` for rows whose `cancelled` is 0. The index is the visit's rule
made by the store: the use case does not load the notes of a visit and
compare them, because the second insert is refused by the index
(`oo-designing-aggregates` rule 6). `add` turns only the unique-index
refusal, `errcode` 2067, into `AbsenceNoteAlreadyLive`, naming the live
row it reads; a different constraint, a busy database or a closed file
is not that error and passes as a fault
(`oo-designing-failure-behaviour` rules 2 and 7). The turn happens here
because the provider's error codes belong to its adapter
(`oo-hiding-implementation` rule 3).

`find` selects the row and rebuilds the note. A missing row raises
`AbsenceNoteNotFound`, a refusal the port declares
(`oo-designing-failure-behaviour` rule 1); a row that fails a value's
check is wrapped in `AbsenceNoteUnreadable`, the fault the port declares
(`oo-designing-failure-behaviour` rule 2). `save` updates the whole note
by its identity and the version before it, so it guards a lost update: a
save of a copy the store has moved past changes no row and raises
`StaleAbsenceNote` (`oo-designing-failure-behaviour` rule 1). No use
case shown reaches that guard, because `AmendAbsenceNote.run` and
`CancelAbsenceNote.run` load their notes after `BEGIN IMMEDIATE` takes
the write lock and save them before `COMMIT`.

`SqliteUnitOfWork.run` shows what a transaction is on this module:
there is no helper, so it runs `BEGIN IMMEDIATE`, the work, `COMMIT`,
and `ROLLBACK` when `isTransaction` is still true. The database opens
with a five-second busy timeout in the composition root, so a second
process waits for the write lock instead of failing at once.

What `add` stores is one whole note, under its `AbsenceNoteId`; what
`save` stores is the changed note, under the same identity. Both rows go
into the SQLite file the composition root opens, in the transaction
`run` opens. The index refuses the second live note for one visit, so
two requests that each issue a note for the same visit end with one note
and one `AbsenceNoteAlreadyLive`, which names the live note.

## The HTTP adapter

`src/adapters/absence-note-http.ts`:

```typescript
import type { IncomingMessage, ServerResponse } from 'node:http'

import type {
  AmendAbsenceNote,
  CancelAbsenceNote,
  IssueAbsenceNote
} from '../application/absence-notes.js'
import {
  AbsenceNoteAlreadyCancelled,
  AbsenceNoteAlreadyLive,
  AbsenceNoteNotFound,
  AbsenceNoteUnreadable,
  AbsencePeriod,
  MalformedIdentifier,
  StaleAbsenceNote,
  asAbsenceNoteId,
  asCalendarDay,
  asClinicianId,
  asPatientId,
  asVisitId,
  type AbsenceNoteId,
  type NotePurpose
} from '../domain/absence-note.js'

class MalformedNoteRequest extends Error {}

export class AbsenceNoteHttp {
  readonly #issue: IssueAbsenceNote
  readonly #amend: AmendAbsenceNote
  readonly #cancel: CancelAbsenceNote

  constructor(issue: IssueAbsenceNote, amend: AmendAbsenceNote,
    cancel: CancelAbsenceNote) {
    this.#issue = issue
    this.#amend = amend
    this.#cancel = cancel
  }

  serve(request: IncomingMessage, response: ServerResponse): void {
    try {
      const url = new URL(request.url ?? '/', 'http://clinic.local')
      if (request.method === 'POST' &&
        url.pathname === '/absence-notes') {
        return this.#issueNote(url, response)
      }
      const action =
        /^\/absence-notes\/([^/]+)\/(amend|cancel)$/.exec(url.pathname)
      if (request.method === 'POST' && action !== null) {
        const id = asAbsenceNoteId(action[1] ?? '')
        if (action[2] === 'amend') {
          return this.#amendNote(id, url, response)
        }
        return this.#cancelNote(id, response)
      }
      this.#send(response, 404, { error: 'not-found' })
    } catch (error) {
      this.#replyRefused(response, error)
    }
  }

  #issueNote(url: URL, response: ServerResponse): void {
    const visit = asVisitId(this.#field(url, 'visitId'))
    const patient = asPatientId(this.#field(url, 'patientId'))
    const clinician = asClinicianId(this.#field(url, 'clinicianId'))
    const id = this.#issue.run(visit, patient, clinician,
      this.#purpose(url), this.#period(url))
    this.#send(response, 201, { id })
  }

  #amendNote(id: AbsenceNoteId, url: URL,
    response: ServerResponse): void {
    this.#amend.run(id, this.#purpose(url), this.#period(url))
    this.#send(response, 200, { id })
  }

  #cancelNote(id: AbsenceNoteId, response: ServerResponse): void {
    this.#cancel.run(id)
    this.#send(response, 200, { id })
  }

  #field(url: URL, name: string): string {
    const value = url.searchParams.get(name)
    if (value === null || value.trim() === '') {
      throw new MalformedNoteRequest(`${name} is missing`)
    }
    return value
  }

  #purpose(url: URL): NotePurpose {
    const text = this.#field(url, 'purpose')
    if (text === 'work' || text === 'school') return text
    throw new MalformedNoteRequest('purpose is neither work nor school')
  }

  #period(url: URL): AbsencePeriod {
    try {
      return new AbsencePeriod(asCalendarDay(this.#field(url, 'firstDay')),
        asCalendarDay(this.#field(url, 'lastDay')))
    } catch (error) {
      if (error instanceof MalformedNoteRequest) throw error
      throw new MalformedNoteRequest('the days do not name a period')
    }
  }

  #replyRefused(response: ServerResponse, error: unknown): void {
    if (error instanceof MalformedNoteRequest ||
      error instanceof MalformedIdentifier) {
      return this.#send(response, 400, { error: 'malformed-request' })
    }
    if (error instanceof AbsenceNoteNotFound) {
      return this.#send(response, 404, { error: 'absence-note-not-found' })
    }
    if (error instanceof AbsenceNoteAlreadyLive) {
      return this.#send(response, 409, {
        error: 'absence-note-already-live', id: error.live
      })
    }
    if (error instanceof AbsenceNoteAlreadyCancelled) {
      return this.#send(response, 409, { error: 'absence-note-cancelled' })
    }
    if (error instanceof StaleAbsenceNote) {
      return this.#send(response, 409, { error: 'stale-absence-note' })
    }
    if (error instanceof AbsenceNoteUnreadable) {
      return this.#send(response, 500, { error: 'internal' })
    }
    this.#send(response, 500, { error: 'internal' })
  }

  #send(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(JSON.stringify(body))
  }
}
```

`serve` reads the method and the path. `POST /absence-notes` issues a
note; `POST /absence-notes/{id}/amend` amends one;
`POST /absence-notes/{id}/cancel` cancels one. Any other path answers
404 with `not-found`. The query string carries the fields, and `#field`,
`#purpose` and `#period` turn its text into the values the use cases
take. A request type never reaches a use case, and no response type
leaves one (`oo-layering-the-system` rule 3). The adapter checks that
the request is well formed; the note decides whether the change is
allowed (`oo-placing-domain-logic` rule 5).

A success answers 201 with `{"id": "..."}` for an issue and 200 with
the same body for an amend or a cancel. Each declared error has one
response:

- `MalformedNoteRequest` or `MalformedIdentifier`: 400 with
  `malformed-request`; the caller fixes the request.
- `AbsenceNoteNotFound`: 404 with `absence-note-not-found`; the caller
  checks the identity.
- `AbsenceNoteAlreadyLive`: 409 with `absence-note-already-live` and the
  live note's `id`; the caller sends amend or cancel to that id.
- `AbsenceNoteAlreadyCancelled`: 409 with `absence-note-cancelled`; the
  caller sees the note is cancelled and issues a new note if the clinic
  allows one.
- `StaleAbsenceNote`: 409 with `stale-absence-note`; no route reaches
  it, because the two use cases that save load and save in one write
  transaction, so it answers a save of a copy the store has moved past.
- `AbsenceNoteUnreadable`: 500 with `internal`; the caller reports the
  fault and the row is repaired.
- Any other error: 500 with `internal`; this is a database fault or a
  lock that outlasts the timeout, and no port declares it.

The `AbsenceNoteUnreadable` branch answers the declared fault and the
last branch any other; the five before it turn a declared error or a
malformed request into the response its caller can act on
(`oo-designing-failure-behaviour` rule 7). This fence stores nothing:
`serve` calls a use case, and the use cases' `run` stores the note.

## The composition root

`src/main.ts`:

```typescript
import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { DatabaseSync } from 'node:sqlite'

import { AbsenceNoteHttp } from './adapters/absence-note-http.js'
import {
  SqliteAbsenceNotes,
  SqliteUnitOfWork
} from './adapters/sqlite-absence-notes.js'
import {
  AmendAbsenceNote,
  CancelAbsenceNote,
  IssueAbsenceNote,
  type AbsenceNoteIds,
  type Clock
} from './application/absence-notes.js'
import {
  asAbsenceNoteId,
  type AbsenceNoteId
} from './domain/absence-note.js'

class RandomAbsenceNoteIds implements AbsenceNoteIds {
  next(): AbsenceNoteId {
    return asAbsenceNoteId(randomUUID())
  }
}

class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

export function startAbsenceNoteServer(databasePath: string,
  timeZone: string): Server {
  const database = new DatabaseSync(databasePath, { timeout: 5_000 })
  const notes = new SqliteAbsenceNotes(database)
  const unitOfWork = new SqliteUnitOfWork(database)
  const ids = new RandomAbsenceNoteIds()
  const clock = new SystemClock()
  const issue = new IssueAbsenceNote(notes, ids, clock, timeZone,
    unitOfWork)
  const amend = new AmendAbsenceNote(notes, unitOfWork)
  const cancel = new CancelAbsenceNote(notes, unitOfWork)
  const http = new AbsenceNoteHttp(issue, amend, cancel)
  return createServer((request, response) => {
    http.serve(request, response)
  })
}
```

`startAbsenceNoteServer` builds the database, the note adapter, the
unit-of-work adapter, the identity adapter, the clock, the three use
cases, the HTTP adapter and the server, each once and in the order each
constructor needs (`oo-inverting-dependencies` rule 3,
`oo-typescript` rule 6). It is the only place that names an adapter.
It takes the clinic's time zone from its caller and passes it to
`IssueAbsenceNote`.

The database opens with a five-second busy timeout, so a second process
waits for the write lock instead of failing at once; a wait that
outlasts it is a fault, not a declared error, and the HTTP adapter
answers 500. The version condition in `save` guards a lost update, and
no use case here reaches it, because the two that save run `find` and
`save` in one write transaction.

The root decides no clinic rule. It opens the file, builds the graph and
returns the server; the caller listens, so a test can start it without a
fixed port. What it opens is the SQLite file; it stores no note itself.

## The end state

The finished subsystem is five files:

- `src/domain/absence-note.ts` holds `PatientId`, `ClinicianId`,
  `VisitId`, `AbsenceNoteId`, `CalendarDay`, `NotePurpose`,
  `AbsencePeriod`, `AbsenceNotes`, `AbsenceNote` and the errors.
- `src/application/absence-notes.ts` holds `Clock`, `AbsenceNoteIds`,
  `UnitOfWork`, `IssueAbsenceNote`, `AmendAbsenceNote` and
  `CancelAbsenceNote`.
- `src/adapters/sqlite-absence-notes.ts` holds `SqliteAbsenceNotes`
  and `SqliteUnitOfWork`.
- `src/adapters/absence-note-http.ts` holds `AbsenceNoteHttp` and
  `MalformedNoteRequest`.
- `src/main.ts` holds `RandomAbsenceNoteIds`, `SystemClock` and
  `startAbsenceNoteServer`.

`AbsenceNote` is the one aggregate root; `AbsencePeriod` and
`CalendarDay` are its values. `AbsenceNotes` is the port, and
`SqliteAbsenceNotes` is its only implementation. `IssueAbsenceNote`,
`AmendAbsenceNote` and `CancelAbsenceNote` are the use cases, and
`AbsenceNoteHttp` is the one way in. The note is stored whole under its
`AbsenceNoteId` in the SQLite file, in the transaction each `run` opens.
Two requests at once for one visit end with one 201 and one 409
`absence-note-already-live`, whose body names the live note; the second
insert met the partial unique index, and only `errcode` 2067 became
`AbsenceNoteAlreadyLive`. A save from a stale copy would answer 409
`stale-absence-note`, though no use case shown reaches it; an amend or a
cancel after a cancel answers 409 `absence-note-cancelled`; an identity
no note has answers 404; a request the values refuse answers 400.

The finished state keeps `oo-typescript` rules 1, 2 and 6,
`oo-layering-the-system` rules 1, 2, 3 and 5,
`oo-inverting-dependencies` rules 1 and 3,
`oo-designing-repositories` rules 1, 2 and 6,
`oo-designing-aggregates` rules 1, 2, 3 and 6,
`oo-encapsulating-state-and-behaviour` rules 1 and 2,
`oo-modeling-values-and-entities` rules 1, 2, 4 and 5,
`oo-modeling-lifecycles` rules 2 and 4,
`oo-placing-domain-logic` rules 2 and 5,
`oo-designing-failure-behaviour` rules 1, 2 and 7,
`oo-hiding-implementation` rule 3 and `oo-taming-persistence` rule 2,
and it keeps the clinic's rules: a visit has at most one live note, an
amendment makes a new version, a cancelled note stays cancelled, and no
fence books, moves or cancels an appointment.
