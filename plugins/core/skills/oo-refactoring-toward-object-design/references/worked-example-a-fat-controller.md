# A worked example of a fat controller

- [The rules](#the-rules)
- [The controller as it starts](#the-controller-as-it-starts)
- [The commits](#the-commits)
- [The turns](#the-turns)
- [The end state](#the-end-state)

## The rules

The clinic's words:

> A patient may ask the clinic for a copy of the records we keep for
> them. Reception confirms who is asking before the request counts. The
> copy is due 14 days after that confirmation. A patient has at most one
> request open at a time. When the records team sends the copy, the
> request closes. The front desk wants the requests whose copy is
> overdue, so it can chase them.

A second request for one patient is the rule that tests the design: it
must be refused, and the first request's copy is due 14 days after the
confirmation. A records request is a claim on a patient's file, not an
appointment, and it never books, moves or releases a slot.

## The controller as it starts

Before:

```text
-- adapters
class RecordsRequestController extends FrameworkController
  - database: ClinicDatabase
  - postbox: Postbox
  - clock: Clock
  + new(database: ClinicDatabase, postbox: Postbox, clock: Clock)
  + post(request: FrameworkRequest): FrameworkReply
    name := request.form("name")
    dateOfBirth := request.form("dateOfBirth")
    patient := database.patientNamed(name, dateOfBirth)
    if patient = null then
      return FrameworkReply.rejected("identity not confirmed")
    else
      existing := database.openRecordsRequestFor(patient)
      if existing = null then
        now := clock.now()
        dueOn := now.date().plusDays(14)
        database.insertRecordsRequest(patient, now, dueOn)
        postbox.sendCopyDue(patient, dueOn)
        return FrameworkReply.ok()
      else
        return FrameworkReply.rejected("a request is already open")
```

`request.form(text)` answers a field's text; `patientNamed` answers the
patient whose name and date of birth match, or `null`;
`openRecordsRequestFor` answers the open request, or `null`;
`insertRecordsRequest` inserts one row, and `sendCopyDue` sends one
message. The fence stores one row, under the patient's identity, in the
clinic's database, in the transaction the framework opens around
`post`; the message is sent before that transaction commits, and the
store's errors are left out.

The controller breaks these rules: it holds the identity decision, the
due-date arithmetic and the one-open check, so the business sits in an
adapter that needs the framework and the store
(`oo-separating-presentation-from-domain` rule 1,
`oo-layering-the-system` rule 2); the 14 days are a primitive carrying
a domain rule, worked out inline
(`oo-modeling-values-and-entities` rule 5); the one-open check reads
the store and then writes, while the store has no unique index, so two
posts for one patient can both read none and both insert
(`oo-designing-aggregates` rule 6); and no object holds the request's
fields or its invariant
(`oo-encapsulating-state-and-behaviour` rule 1).

## The commits

The ten commits below leave the controller's replies the same, except
where a commit says otherwise; the tests in the table pin those
replies, and every commit runs them. In the table, *values* is
`oo-modeling-values-and-entities`; *aggregates*
`oo-designing-aggregates`; *state* `oo-encapsulating-state-and-behaviour`;
*placing* `oo-placing-domain-logic`; *responsibilities*
`oo-assigning-responsibilities`; *inverting*
`oo-inverting-dependencies`; *repositories* `oo-designing-repositories`;
*layering* `oo-layering-the-system`; *reads*
`oo-separating-reads-from-writes`; *presentation*
`oo-separating-presentation-from-domain`; *lifecycles*
`oo-modeling-lifecycles`; *naming* `oo-naming-classes-and-methods`;
*refactoring* is this skill.

| # | What moves | Rule or move | Kept by |
| --- | --- | --- | --- |
| 1 | The replies are pinned | refactoring 2 | T1: success and two refusals |
| 2 | The due date becomes `DueDate` | values 5 | T2: the same stored date |
| 3 | The request holds its data | values 1, 4 | T3: the same row |
| 4 | Store calls go behind ports | inverting 1 | T4: the same query and row |
| 5 | Identity becomes a value and a check | placing 3 | T5: the same refusal |
| 6 | A use case takes it | responsibilities 5 | T6: one row, one notice |
| 7 | The index refuses a second | aggregates 6 | T7: one stored, one refused |
| 8 | The copy send closes | lifecycles 1, 2 | T8: closed, off the list |
| 9 | The overdue list becomes a read | reads 2 | T9: the same rows |
| 10 | The controller reads and delegates | presentation 1 | T1 to T9 |

Commit 7 changes behaviour under two requests at once, so it is a step
of its own, as `oo-refactoring-toward-object-design` rule 1 asks; the
sequential reply is unchanged, and the store now refuses the second
that the old query could not see.

## The turns

### The due date and the request

Commits 2 and 3 replace the inline date with `DueDate` and give the
request its fields. The value holds the fixed period, so the 14 has one
home (`oo-modeling-values-and-entities` rule 5); the request is an
entity with an identity that never changes
(`oo-modeling-values-and-entities` rules 1 and 4).

```text
-- domain
value DueDate
  - dueOn: Date
  + new(dueOn: Date)
  + dueOn(): Date
    return dueOn
  + static after(confirmedAt: DateTime): DueDate
    return new DueDate(confirmedAt.date().plusDays(14))

class RecordsRequest
  - id: RecordsRequestId
  - patient: PatientId
  - confirmedAt: DateTime
  - dueDate: DueDate
  - sentAt: DateTime?
  - new(id: RecordsRequestId, patient: PatientId,
      confirmedAt: DateTime, dueDate: DueDate,
      sentAt: DateTime?)
  + static confirm(id: RecordsRequestId, patient: PatientId,
      at: DateTime): RecordsRequest
    return new RecordsRequest(id, patient, at,
      DueDate.after(at), null)
  + static restore(id: RecordsRequestId, patient: PatientId,
      confirmedAt: DateTime, dueDate: DueDate,
      sentAt: DateTime?): RecordsRequest
    return new RecordsRequest(id, patient, confirmedAt, dueDate,
      sentAt)
  + dueDate(): DueDate
    return dueDate
  + isOverdueOn(day: Date): Boolean
    if sentAt = null then
      return dueDate.dueOn().isBefore(day)
    else
      return false
  + close(at: DateTime): void
    raises RecordsRequestAlreadySent
    if sentAt = null then
      sentAt := at
    else
      raise RecordsRequestAlreadySent
    return
```

`confirmedAt.date()` is the calendar date of that moment, and
`dueOn.isBefore(day)` that the due date is earlier; `DueDate.after` is
the only place that adds the 14 days. `confirm` builds the due date from
the confirmation time, and `restore` rebuilds a stored request through
the private constructor, so no adapter writes a field. Every field is
set by a constructor before a method reads it; `close` reads `sentAt`
and sets it once or raises, and `isOverdueOn` reads it and changes
nothing. The request is stored whole under its `RecordsRequestId`, in
the clinic's database, in the transaction `RequestRecordsCopy.run`
opens; the fence leaves the store and that transaction out.

`close` is the only writer of `sentAt`, and no getter hands out a field
a caller may write (`oo-designing-aggregates` rule 2,
`oo-encapsulating-state-and-behaviour` rules 1 and 2). The request
names its patient by `PatientId` and holds no patient object
(`oo-designing-aggregates` rule 3); its fields change together, with no
other aggregate inside it (`oo-designing-aggregates` rule 1). `close`
returns nothing; `isOverdueOn` and `dueDate` answer and change nothing
(`oo-encapsulating-state-and-behaviour` rule 4).

### The rules leave the controller

Commits 4 to 6 put the store behind `RecordsRequests`, the identity
match behind `RequesterCheck`, and the rest of `post` into
`RequestRecordsCopy`.

```text
-- domain
interface RecordsRequests
  + add(request: RecordsRequest): void
    raises RecordsRequestAlreadyOpen
  + find(id: RecordsRequestId): RecordsRequest
    raises RecordsRequestNotFound
  + save(request: RecordsRequest): void
    raises StaleRecordsRequest

interface RecordsRequestIds
  + next(): RecordsRequestId

interface PatientIdentities
  + match(identity: RequesterIdentity): PatientId?

class RequesterCheck
  - identities: PatientIdentities
  + new(identities: PatientIdentities)
  + confirm(identity: RequesterIdentity): PatientId
    raises RequesterNotConfirmed
    patient := identities.match(identity)
    if patient = null then
      raise RequesterNotConfirmed
    else
      return patient

interface PatientNotices
  + announceDueDate(patient: PatientId, dueDate: DueDate): void
    raises NoticeNotSent

-- application
class RequestRecordsCopy
  - check: RequesterCheck
  - ids: RecordsRequestIds
  - requests: RecordsRequests
  - notices: PatientNotices
  - clock: Clock
  + new(check: RequesterCheck, ids: RecordsRequestIds,
      requests: RecordsRequests, notices: PatientNotices,
      clock: Clock)
  + run(identity: RequesterIdentity): void
    patient := check.confirm(identity)
    now := clock.now()
    request := RecordsRequest.confirm(ids.next(), patient, now)
    requests.add(request)
    notices.announceDueDate(patient, request.dueDate())
    return
```

`PatientIdentities.match` answers the patient whose record matches the
identity, or `null`; `RequesterCheck.confirm` sends it once and raises
when it answers `null`, so the domain decides who may ask
(`oo-placing-domain-logic` rule 3). `RecordsRequests` reads like a
collection of whole requests, uses only domain types, and no
connection, row or query text crosses it
(`oo-designing-repositories` rules 1 and 2); the ports point inward and
every class receives its collaborators through its constructor
(`oo-inverting-dependencies` rules 1 and 2,
`oo-layering-the-system` rule 1). The adapters raise only the errors
their ports declare; `RequestRecordsCopy` only coordinates
(`oo-placing-domain-logic` rule 2,
`oo-assigning-responsibilities` rule 5).

The request is stored whole under its `RecordsRequestId`, in the
clinic's database, in the transaction `run` opens around
`requests.add`; the fence leaves the store and that transaction out.
The unique index is a partial unique index on the records-request
table, over the patient column for rows whose sent time is empty; the
database adapter raises `RecordsRequestAlreadyOpen` when the insert
meets it, and the in-memory adapter keeps the same index
(`oo-designing-aggregates` rule 6). The caller tells the patient that a
request is already open. The notice is sent
after the add's transaction commits, so a failed notice leaves the
request stored and the caller retries the notice, not the request; a
refused `add` sends no notice. Each message is sent once.

## The end state

The controller keeps the form read, the request id read and the reply;
it decides no clinic rule (`oo-separating-presentation-from-domain`
rule 1, `oo-layering-the-system` rule 2).

```text
-- adapters
class RecordsRequestController extends FrameworkController
  - requests: RequestRecordsCopy
  - copies: SendRecordsCopy
  - overdue: ListOverdueRecordsRequests
  + new(requests: RequestRecordsCopy, copies: SendRecordsCopy,
      overdue: ListOverdueRecordsRequests)
  + post(request: FrameworkRequest): FrameworkReply
    requests.run(requesterIn(request))
    return FrameworkReply.ok()
  + postSent(request: FrameworkRequest): FrameworkReply
    copies.run(requestIdIn(request))
    return FrameworkReply.ok()
  + getOverdue(request: FrameworkRequest): FrameworkReply
    return FrameworkReply.ok(overdue.run())
  - requesterIn(request: FrameworkRequest): RequesterIdentity
    raises MalformedRequesterIdentity
  - requestIdIn(request: FrameworkRequest): RecordsRequestId
    raises MalformedRecordsRequestId

-- domain
interface RecordCopies
  + send(request: RecordsRequest): void
    raises CopyNotSent

interface OverdueRecords
  + on(day: Date): List<OverdueRecordsRequest>

value OverdueRecordsRequest
  - request: RecordsRequestId
  - patient: PatientId
  - dueOn: Date
  + new(request: RecordsRequestId, patient: PatientId,
      dueOn: Date)

-- application
class SendRecordsCopy
  - requests: RecordsRequests
  - copies: RecordCopies
  - clock: Clock
  + new(requests: RecordsRequests, copies: RecordCopies,
      clock: Clock)
  + run(id: RecordsRequestId): void
    request := requests.find(id)
    copies.send(request)
    request.close(clock.now())
    requests.save(request)
    return

class ListOverdueRecordsRequests
  - overdue: OverdueRecords
  - clock: Clock
  + new(overdue: OverdueRecords, clock: Clock)
  + run(): List<OverdueRecordsRequest>
    now := clock.now()
    return overdue.on(now.date())
```

`requesterIn` and `requestIdIn` read the form's text into the values
and raise their errors when it does not parse; the use cases' errors
pass to the framework, which turns each into the reply the start
controller returned (`oo-placing-domain-logic` rule 5). The framework's
types appear only in the controller (`oo-layering-the-system` rule 3).
`SendRecordsCopy.run` sends `close` and never reads `sentAt` to set it
(`oo-encapsulating-state-and-behaviour` rule 3). The copy is sent before
the close, so `CopyNotSent` leaves the request open and the caller
retries the send. The close checks `sentAt` and changes it in one
method; the store's version check refuses a save made from a replaced
copy with `StaleRecordsRequest`, and the caller reloads and retries. A
retry on a closed request raises `RecordsRequestAlreadySent`, and a
retry before that sends a second copy, which no clinic rule refuses. A
missing request raises `RecordsRequestNotFound` and the caller stops.
The request is stored whole under its `RecordsRequestId`, in the
clinic's database, in the transaction `run` opens around `save`
(`oo-designing-repositories` rule 6); the fence leaves the store and
that transaction out.

The read is separate from the writes
(`oo-separating-reads-from-writes` rules 1 and 2):
`OverdueRecords.on(day)` answers the rows of open requests whose due
date is before `day`; the database adapter writes that condition in one
query, the in-memory adapter sends `isOverdueOn(day)` to each request,
and the rule is `RecordsRequest.isOverdueOn`, not the adapter. The read
loads no aggregate; `run` asks the clock once.

The finished design has the values `DueDate`, `RecordsRequestId`,
`RequesterIdentity` and `OverdueRecordsRequest`, the entity
`RecordsRequest`, the ports `RecordsRequests`, `RecordsRequestIds`,
`PatientIdentities`, `PatientNotices`, `RecordCopies` and
`OverdueRecords`, the domain service `RequesterCheck`, the use cases
`RequestRecordsCopy`, `SendRecordsCopy` and
`ListOverdueRecordsRequests`, and the adapter
`RecordsRequestController`. `RecordsRequest` is the entity; the other
four are values, and `restore` keeps the request's identity
(`oo-modeling-values-and-entities` rules 1 and 4). The class names are
nouns; `close`, `add`, `find` and `save` name effects, while `dueDate`,
`isOverdueOn` and `on` answer questions; a records request, a copy, a
notice, a due date and an overdue request each keep one word
(`oo-naming-classes-and-methods` rules 1, 2 and 4). The words are the
clinic's, and no Row, Table, Dto or Json appears in the domain
(`oo-speaking-the-domain-language` rules 1 and 6). The 14 days have one
home in `DueDate.after` (`oo-modeling-values-and-entities` rule 5);
`confirm` opens and `close` closes, each as its own method
(`oo-modeling-lifecycles` rules 1 and 2); the write and read use cases
are separate (`oo-separating-reads-from-writes` rule 1), and `run`
asks the clock once in each (`oo-modeling-lifecycles` rule 5).

That state keeps `oo-layering-the-system` rules 1, 2 and 3,
`oo-separating-presentation-from-domain` rule 1,
`oo-placing-domain-logic` rules 2, 3 and 5,
`oo-assigning-responsibilities` rule 5,
`oo-inverting-dependencies` rules 1 and 2,
`oo-designing-repositories` rules 1, 2 and 6,
`oo-designing-aggregates` rules 1, 2, 3 and 6,
`oo-encapsulating-state-and-behaviour` rules 1, 2, 3 and 4,
`oo-modeling-values-and-entities` rules 1, 4 and 5,
`oo-modeling-lifecycles` rules 1, 2 and 5,
`oo-separating-reads-from-writes` rules 1 and 2,
`oo-naming-classes-and-methods` rules 1, 2 and 4,
`oo-speaking-the-domain-language` rules 1 and 6, and it keeps the
clinic's rules: a patient has one open request, its copy is due 14 days
after the confirmation, a sent copy closes the request, and the front
desk's list shows the late ones.
