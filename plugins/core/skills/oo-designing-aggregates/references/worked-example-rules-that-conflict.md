# A worked example of rules that conflict

- [The rules](#the-rules)
- [Candidate 1: the examination holds the chaperone](#candidate-1-the-examination-holds-the-chaperone)
- [Candidate 2: the chaperone holds its examinations](#candidate-2-the-chaperone-holds-its-examinations)
- [Candidate 3: one day for the clinic](#candidate-3-one-day-for-the-clinic)
- [The boundary chosen](#the-boundary-chosen)
- [What the chosen boundary gives up](#what-the-chosen-boundary-gives-up)
- [The end state](#the-end-state)

## The rules

The clinic says:

> An examination at a visit may need a chaperone, a member of staff who
> stays in the room. An examination that needs a chaperone does not
> start without one. A chaperone attends one examination at a time. A
> patient may decline a chaperone, and the clinic records the decline.
> Booking an appointment does not wait for the chaperone rota.

When no chaperone is free, the start is refused and the examination is
not recorded; the clinician tries again when one is free. A recorded
decline lets the examination start with no chaperone; it does not forbid
a chaperone from staying.

The start rule and the one-at-a-time rule read the examination and the
chaperone together; the decline is a fact about the examination alone;
the booking rule keeps the appointment and its slot away from every
chaperone. Each candidate is a separate design; only one ships.

## Candidate 1: the examination holds the chaperone

One aggregate per examination, with the chaperone object inside it.

```text
class Examination
  - id: ExaminationId
  - needsChaperone: Boolean
  - declined: Boolean
  - chaperone: Chaperone?
  + new(id: ExaminationId, needsChaperone: Boolean, declined: Boolean)
    chaperone := null
  + start(attendant: Chaperone?): void
    raises ChaperoneRequired
    if needsChaperone then
      if declined = false then
        if attendant = null then
          raise ChaperoneRequired
    chaperone := attendant
    return
```

`new` sets `id`, `needsChaperone` and `declined`, then `chaperone` before
`start` reads it; `start` writes `chaperone` once. The examination is
stored whole under its `ExaminationId`; this fence leaves the store and
the transaction out.

The start rule and the decline rule are kept in one transaction; the
booking rule is untouched. The one-at-a-time rule is broken: two
examinations can each hold a copy of one chaperone, and each `start` sees
only its own examination, so both start. Holding the chaperone object
also breaks `oo-designing-aggregates` rule 3, and a save writes one
chaperone twice.

## Candidate 2: the chaperone holds its examinations

Move the one-at-a-time rule to the chaperone. The examination is its own
aggregate, as in the first candidate, but holds `chaperone:
ChaperoneId?`; its `start` takes `attendant: ChaperoneId?` and assigns it
to `chaperone`, raising `ChaperoneRequired` when a needed examination is
not declined and no attendant is given.

```text
class Chaperone
  - id: ChaperoneId
  - attending: ExaminationId?
  + new(id: ChaperoneId, attending: ExaminationId?)
  + attend(examination: ExaminationId): void
    raises ChaperoneBusy
    if attending = null then
      attending := examination
    else
      if attending = examination then
        return
      else
        raise ChaperoneBusy
    return
  + finish(examination: ExaminationId): void
    if attending = examination then
      attending := null
    return
```

The constructor sets `id` and `attending` before `attend` or `finish`
reads them. `attend` reads `attending` and sets it once for a free
chaperone or a repeat of the same examination, and raises for a
different one; a repeat is not a second attendance, so the clinic does
not refuse it. `finish` clears it only for the examination it names. The
chaperone is stored under its `ChaperoneId`; this fence leaves the store,
the version column and the transaction out.

The one-at-a-time rule is kept here, the decline rule on the examination,
and the booking rule is untouched. The start rule is delayed: the two
writes change two aggregates that both exist, so `oo-designing-aggregates`
rule 4 does not allow one transaction. If `attend` is first, a refused
start leaves the chaperone taken for an examination that never started;
if `start` is first and `attend` refuses, an examination starts while
the chaperone is busy. A later step can correct either, but the two are
not one commit.

`attend` checks `attending` and changes it in one method. Two starts can
both load the chaperone free and both save; the store's version check
refuses the second save with `StaleChaperone`, so the second start
reloads; a different examination then raises `ChaperoneBusy`, and the
same one returns.

## Candidate 3: one day for the clinic

Make the day one aggregate. It holds every examination and every
attending id, so all three changing rules read one object.

```text
class Examination
  - id: ExaminationId
  - needsChaperone: Boolean
  - declined: Boolean
  - chaperone: ChaperoneId?
  + new(id: ExaminationId, needsChaperone: Boolean, declined: Boolean,
      chaperone: ChaperoneId?)

class ClinicDay
  - date: Date
  - attending: List<ChaperoneId>
  - examinations: List<Examination>
  + new(date: Date)
    attending := new List<ChaperoneId>()
    examinations := new List<Examination>()
  + start(id: ExaminationId, needsChaperone: Boolean,
      declined: Boolean, attendant: ChaperoneId?): void
    raises ChaperoneRequired, ChaperoneBusy
    if needsChaperone then
      if declined = false then
        if attendant = null then
          raise ChaperoneRequired
    if attendant = null then
      examinations.add(new Examination(id, needsChaperone, declined,
        null))
    else
      if attending.contains(attendant) then
        raise ChaperoneBusy
      else
        attending.add(attendant)
        examinations.add(new Examination(id, needsChaperone, declined,
          attendant))
    return
  + finish(attendant: ChaperoneId): void
    attending.remove(attendant)
    return
```

The examination's constructor sets its fields; the day's sets `attending`
and `examinations` before `start` or `finish` reads them. `start` adds one
examination and, when a chaperone is named, one id; `finish` removes one
id. The day is stored under its `date`; the fence leaves the store and
transaction out.

The start rule, the one-at-a-time rule and the decline rule are kept in
one transaction; the booking rule is untouched. What the candidate gives
up is size: every start loads and saves every examination and every
attending id, and two starts for different chaperones collide on the
day's version. `oo-designing-aggregates` rule 5 tips against it. The
check of `attending` and its change is behind the day's version check; a
racing save is refused and the retry sees the first id, and the fence
leaves the version column out.

## The boundary chosen

Take the one-examination boundary of the first candidate and the
chaperone aggregate of the second, and create the examination when it
starts. The examination holds the chaperone's identity; the chaperone
holds the one examination it is attending; the start takes it and
stores the new examination in one transaction. Creating the examination
is the change `oo-designing-aggregates` rule 4's exception allows: one
aggregate is new, so nobody else can change it, and a conflict on the
chaperone refuses the whole start.

```text
class Examination
  - id: ExaminationId
  - visit: VisitId
  - needsChaperone: Boolean
  - declined: Boolean
  - chaperone: ChaperoneId?
  + new(id: ExaminationId, visit: VisitId, needsChaperone: Boolean,
      declined: Boolean, chaperone: ChaperoneId?)
    raises ChaperoneRequired
    if needsChaperone then
      if declined = false then
        if chaperone = null then
          raise ChaperoneRequired
    -- every field is set from the parameter of its name
```

The constructor sets every field from the parameter of its name, and
refuses a needed examination with no chaperone and no recorded decline.
The examination has no `start` method: it is built when it starts, so its
existence is the start. It is stored under its `ExaminationId`, in the
clinic's database, in the transaction `StartExamination` opens; this
fence leaves the store and the transaction out. The constructor checks
its arguments, not a stored state.

```text
interface Chaperones
  + find(id: ChaperoneId): Chaperone
    raises ChaperoneNotFound
  + save(chaperone: Chaperone): void
    raises StaleChaperone

interface Examinations
  + add(examination: Examination): void
    raises ExaminationAlreadyRecorded

class StartExamination
  - chaperones: Chaperones
  - examinations: Examinations
  + new(chaperones: Chaperones, examinations: Examinations)
  + run(id: ExaminationId, visit: VisitId, needsChaperone: Boolean,
      declined: Boolean, chaperone: ChaperoneId?): void
    examination := new Examination(id, visit, needsChaperone, declined,
      chaperone)
    if chaperone = null then
      examinations.add(examination)
    else
      attendant := chaperones.find(chaperone)
      attendant.attend(id)
      chaperones.save(attendant)
      examinations.add(examination)
    return
```

The constructor sets both ports before `run` reads them. `run` builds one
examination; a needed chaperone with no decline and no id raises
`ChaperoneRequired` before any store is touched. With no chaperone it
adds one examination; with one it finds it once, sends `attend` once,
saves it once and adds the examination once. The ports declare
`ChaperoneNotFound` from `find`, `StaleChaperone` from `save` and
`ExaminationAlreadyRecorded` from `add`; `attend` raises `ChaperoneBusy`
for a different examination.

`run` opens one transaction over the two ports; the store commits both
or neither. The examination is new, so `oo-designing-aggregates` rule
4's exception covers the pair. If `save` raises `StaleChaperone` or
`add` raises `ExaminationAlreadyRecorded`, the transaction rolls back:
no examination is stored and the chaperone is unchanged. A caller that
catches `StaleChaperone` reloads it and runs the start again; the
current copy either takes the examination, names the same one and
returns, or names a different one and raises `ChaperoneBusy`. A caller
that catches `ExaminationAlreadyRecorded` treats the examination as
started; one that catches `ChaperoneNotFound` stops; one that catches
`ChaperoneBusy` asks for another chaperone or tries later. The
examination is stored under its `ExaminationId` and the chaperone under
its `ChaperoneId`, in the clinic's database, in that transaction.

The start rule, the one-at-a-time rule and the decline rule are true
when the transaction commits. The release is brought true later by
`oo-designing-aggregates` rule 4: an ending step, left out here, loads
the chaperone and sends `finish` after the examination ends, and is
retried when its save is refused with `StaleChaperone`; a stale `finish`
clears only the examination it names.

No fence books an appointment; booking changes the appointment and its
slot, never these two aggregates, so it never waits for the rota.

## What the chosen boundary gives up

The chosen boundary gives up a record of an examination before it
starts, so the clinic cannot list the examinations waiting for a
chaperone; a clinic that needs that list needs a planned examination and
the second candidate's hold.

It also needs one store that commits both aggregates; when they cannot
share a transaction, the second candidate's hold returns.

The release is a later step, so a chaperone is free only after it runs;
if it fails, the chaperone stays busy and the clinic waits. Every start
of the same chaperone also waits on its row, for as long as one start's
transaction.

## The end state

`Examination` is one record per examination that started, holding its
visit, its need and decline, and the chaperone's identity or `null`;
`Chaperone` holds the examination it is attending or `null`.
`Chaperones` and `Examinations` are the ports; `StartExamination` creates
the examination and takes the chaperone, and the ending step that frees
the chaperone is left out.

That state keeps `oo-designing-aggregates` rules 1, 3, 4 and 5,
`oo-encapsulating-state-and-behaviour` rules 2 and 4,
`oo-placing-domain-logic` rule 2, `oo-inverting-dependencies` rule 1 and
`oo-layering-the-system` rule 2, and it keeps the clinic's rules: a
needed examination starts with a chaperone or a recorded decline, a
chaperone attends one examination at a time, and no booking touches
either aggregate.
