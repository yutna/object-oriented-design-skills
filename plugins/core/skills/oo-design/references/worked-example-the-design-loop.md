# A worked example of the design loop

- [The request](#the-request)
- [The sizing row](#the-sizing-row)
- [The gate](#the-gate)
- [Step 1: the clinic's words](#step-1-the-clinics-words)
- [Step 2: the consistency boundary](#step-2-the-consistency-boundary)
- [Step 3: where each rule lives](#step-3-where-each-rule-lives)
- [Step 4: messages and states](#step-4-messages-and-states)
- [Step 5: ports and layers](#step-5-ports-and-layers)
- [Step 6: names and comments](#step-6-names-and-comments)
- [Step 7: the review](#step-7-the-review)
- [The end state](#the-end-state)

## The request

The clinic's request, in the words its nurses and reception use:

> We keep the vaccines and the other medicines in one fridge. The nurses
> take the fridge's temperature twice a day: the morning reading is due
> by 09:00 and the afternoon reading by 17:00. A reading from 2°C to 8°C,
> both ends included, is safe. A reading outside that range holds the
> contents: nobody may use them until a nurse releases them and records
> the release under the nurse's name. A reading still missing at its deadline
> shows on the front desk's list, so reception can chase it.

The log of one fridge is the subject of this example. The request is the
whole input; no other system is in scope.

## The sizing row

The request adds a record of readings, a rule about when the contents are
held, and a list for reception. It is one feature in existing work, but
it brings new classes and rules of its own. In
[how much design a task warrants](../SKILL.md#how-much-design-a-task-warrants),
that is **A new class or module: the design loop, nothing skipped.** It
is not one method in an existing class, and not a new context or system.

## The gate

The one rule the software must keep is: **the fridge's contents stay
held from the first reading outside the safe range until a named nurse
releases them.** One log accepts the rule: a reading of 5°C leaves the
contents usable, a reading of 9°C holds them, and a release recorded by
the nurse who checks the fridge leaves them usable again. One log
rejects it: a reading of 9°C followed by a reading of 5°C with no
release; the second reading must not lift the hold by itself.

The hold and the release are what the end state is checked against.

## Step 1: the clinic's words

The clinic says *reading*, *safe range*, *hold* and *release*. The code
has no class for the first three, so each gets one: the reading becomes
a `FridgeReading`, the safe range a `TemperatureRange`, and the log that
holds both a `FridgeLog` (`oo-speaking-the-domain-language` rule 2). No
flag called `isBad` stands in for the range, and no status number stands
in for the hold.

The reading holds the degrees and asks the range whether they are safe,
and the range holds its two ends and answers whether one degree lies
within them (`oo-assigning-responsibilities` rule 1). The clinic's two
rounds, `Morning` and `Afternoon`, are an enumeration because they carry
no data.

```text
enum ReadingRound
  Morning
  Afternoon

value TemperatureRange
  - lowest: Int
  - highest: Int
  + new(low: Int, high: Int)
    raises EmptyTemperatureRange
    if high.isBelow(low) then
      raise EmptyTemperatureRange
    else
      lowest := low
      highest := high
  + includes(celsius: Int): Boolean
    return celsius.isWithin(lowest, highest)

value FridgeReading
  - round: ReadingRound
  - takenAt: DateTime
  - celsius: Int
  + new(round: ReadingRound, takenAt: DateTime, celsius: Int)
  + isWithin(range: TemperatureRange): Boolean
    return range.includes(celsius)
```

`high.isBelow(low)` is taken to mean the highest end sits below the
lowest. `celsius.isWithin(lowest, highest)` is taken to mean the degree
lies between the two ends, both included. `FridgeReading` and
`TemperatureRange` are values (`oo-modeling-values-and-entities`
rule 1). A range whose highest end sits below its lowest is refused when
it is built, so every range can answer `includes`
(`oo-making-illegal-states-impossible` rule 3). The degrees stay an
`Int`; the range is the only rule over them.

## Step 2: the consistency boundary

The hold and the readings it depends on must be true together: a reading
outside the range and the held contents cannot be saved apart, or a
nurse could use the contents between the two saves. The boundary is one
`FridgeLog` per fridge: its readings and range are inside it, and the
nurse who releases belongs to another aggregate, so the log keeps a
`ClinicianId` (`oo-designing-aggregates` rules 1 and 3).

```text
class FridgeLog
  - fridge: FridgeId
  - range: TemperatureRange
  - readings: List<FridgeReading>
  - held: Boolean
  + new(fridge: FridgeId, range: TemperatureRange)
    readings := new List<FridgeReading>()
    held := false
```

The log is stored whole under its `FridgeId`, which is a type only; this
fence leaves the store and the transaction out, and step 5 places them.

## Step 3: where each rule lives

The hold rule lives on the log, because the log holds the range, the
readings and the held state. The release rule lives on the log too,
because a release changes the hold and names the nurse who made it.
Neither rule needs a service: the log has the data and the rule
together, and no use case decides for it
(`oo-placing-domain-logic` rule 1, `oo-assigning-responsibilities`
rule 4). The front desk's missing list is not a change; it is decided
with the read in step 5.

```text
class FridgeLog
  - releasedBy: ClinicianId?
  + record(reading: FridgeReading): void
    readings.add(reading)
    if reading.isWithin(range) then
      return
    else
      held := true
    return
  + release(nurse: ClinicianId): void
    raises ContentsNotHeld
    if held then
      held := false
      releasedBy := nurse
    else
      raise ContentsNotHeld
    return
```

The constructor adds `releasedBy := null` beside the fields step 2 sets.
`ClinicianId` keeps the constructor `oo-modeling-values-and-entities`
gives it; this example uses it as a type only.
`record` appends one reading and reads `range` once; a reading
inside the range returns, and one outside sets `held` true. `release`
reads `held` once and either clears it and records the nurse, or raises
`ContentsNotHeld`. Two nurses releasing the same hold both read the same
loaded log; the store's version check refuses the second save with
`StaleFridgeLog`, which step 5's `save` declares, so one release is
recorded, and the fence leaves the version column out. What this fence
changes is one `FridgeLog`; step 5 stores it whole under its `FridgeId`,
in the clinic's database, in the transaction `RecordFridgeReading` or
`ReleaseFridgeContents` opens, and this fence leaves the store and that
transaction out.

## Step 4: messages and states

The log answers two commands that change it, `record` and `release`, and
three queries that only answer, `isHeld`, `releasedBy` and `hasReading`
(`oo-encapsulating-state-and-behaviour` rule 4). No setter exists for
`held` or `releasedBy`; a caller changes either only by sending `record`
or `release` (`oo-encapsulating-state-and-behaviour` rule 2). A new hold
clears the release name, so a held log never carries the name of a nurse
who released an earlier hold. Every state the public actions can reach
is then a state the clinic has
(`oo-making-illegal-states-impossible` rule 1).

```text
class FridgeLog
  + isHeld(): Boolean
    return held
  + releasedBy(): ClinicianId?
    return releasedBy
  + hasReading(round: ReadingRound, day: DateTime): Boolean
    return readings.hasReading(round, day)
  + record(reading: FridgeReading): void
    readings.add(reading)
    if reading.isWithin(range) then
      return
    else
      held := true
      releasedBy := null
    return
```

`release` is unchanged from step 3. `isHeld` and `releasedBy` read fields
the constructor sets and the two commands change; `hasReading` asks the
log's own readings whether one of that round was taken on the day of
`day`, and changes nothing. `record` still appends one reading, and its
outside branch now sets two fields once. The store's version check
refuses a save made from a copy another change has replaced, so a
`record` that races a `release` is retried on the current copy; the
fence leaves the version column out. What this fence changes is the same
one `FridgeLog`; step 5 stores it whole under its `FridgeId`, in the
clinic's database, in the transaction `RecordFridgeReading` opens, and
this fence leaves that store and that transaction out.

## Step 5: ports and layers

The domain knows no database. The log is found and saved through
`FridgeLogs`, a port declared beside the domain, and the store's adapter
answers it at the edge (`oo-inverting-dependencies` rule 1). Two use
cases change a log: `RecordFridgeReading` loads the log, sends `record`
and saves it; `ReleaseFridgeContents` loads the log, sends `release` and
saves it (`oo-layering-the-system` rule 2, `oo-placing-domain-logic`
rule 2). The front desk's missing list changes nothing, so a read query
shaped for the screen serves it, not the log's repository, and the rule
the list applies stays in the domain (`oo-separating-reads-from-writes`
rule 2).

```text
-- domain
interface FridgeLogs
  + add(log: FridgeLog): void
  + find(fridge: FridgeId): FridgeLog
    raises FridgeLogNotFound
  + save(log: FridgeLog): void
    raises StaleFridgeLog
  + remove(log: FridgeLog): void

value MissingReadingCheck
  - round: ReadingRound
  - deadline: DateTime
  - now: DateTime
  + new(round: ReadingRound, deadline: DateTime, now: DateTime)
  + round(): ReadingRound
    return round
  + deadline(): DateTime
    return deadline
  + now(): DateTime
    return now
  + isSatisfiedBy(log: FridgeLog): Boolean
    if now.isBefore(deadline) then
      return false
    else
      if log.hasReading(round, deadline) then
        return false
      else
        return true

-- application
value MissingReading
  - fridge: FridgeId
  - round: ReadingRound
  - deadline: DateTime
  + new(fridge: FridgeId, round: ReadingRound, deadline: DateTime)

interface MissingReadings
  + matching(check: MissingReadingCheck): List<MissingReading>

class RecordFridgeReading
  - logs: FridgeLogs
  + new(logs: FridgeLogs)
  + run(fridge: FridgeId, reading: FridgeReading): void
    log := logs.find(fridge)
    log.record(reading)
    logs.save(log)
    return

class ReleaseFridgeContents
  - logs: FridgeLogs
  + new(logs: FridgeLogs)
  + run(fridge: FridgeId, nurse: ClinicianId): void
    log := logs.find(fridge)
    log.release(nurse)
    logs.save(log)
    return

class ListMissingReadings
  - missing: MissingReadings
  - clock: Clock
  + new(missing: MissingReadings, clock: Clock)
  + run(round: ReadingRound, deadline: DateTime): List<MissingReading>
    now := clock.now()
    return missing.matching(new MissingReadingCheck(round, deadline, now))
```

The `-- domain` and `-- application` comments mark the layers. `FridgeLogs`
is the port the domain declares; an adapter at the edge answers it, and
the composition root builds each use case with that adapter
(`oo-inverting-dependencies` rule 3). The clinic builds a log when it
installs a fridge, in a use case this example leaves out; no use case
removes a log, so no fence sends `remove`.

A business condition found in an adapter moves inward
(`oo-layering-the-system` rule 2), so the missing rule is
`MissingReadingCheck`, a value in the domain. The read asks its clock
once and builds the check with that moment, because a rule the passing of
time decides takes the time as a value (`oo-modeling-lifecycles`
rule 5). `ListMissingReadings.run` hands the check to
`MissingReadings.matching`. A database adapter turns `round()`,
`deadline()` and `now()` into one query over the log tables, an in-memory
one sends `isSatisfiedBy` to each log, and the front desk asks once for
each of the clinic's two deadlines, 09:00 and 17:00, which are the
`deadline` values the request states. Before its deadline no log
satisfies `MissingReadingCheck`, and after it only a log with no reading
of that round that day does, so no row appears before a reading is due.
The read loads no aggregate: the adapter selects the rows and
`MissingReading` carries the fridge, round and deadline to the screen,
with no change to any state. `Clock` is the inverting dependencies
skill's port, whose `now()` answers the current time.

Each write `run` opens one transaction, loads one log, sends one command
and saves the log whole; what is stored is the log, under its `FridgeId`,
in the clinic's database, in that transaction. The store's version check
refuses a save made from a log another change has replaced, and `save`
declares that refusal as `StaleFridgeLog`. A refused `save` passes out
of `run`; its caller reloads the log, repeats the change on the current
copy and saves again. For `RecordFridgeReading` the retry records the
reading, and an outside reading still sets the hold, so a reading that
loses the race is not dropped; the clinic has no rule that refuses a
second reading, so the retry records it. For `ReleaseFridgeContents` the
retry reads the current copy, and when another release has already
cleared the hold, `release` raises `ContentsNotHeld`, which is the
clinic's rule and not the version check. The fence leaves the version
column, the adapters and the transaction boundaries out. No field is
read before it is set, and each `run` sends each message once.

## Step 6: names and comments

The names already use the clinic's words and say what each method does.
`FridgeLog`, `FridgeReading`, `TemperatureRange` and `MissingReadingCheck` are
nouns; `record` and `release` are verbs for the effects they have;
`ListMissingReadings` names the read's job; `isHeld`, `releasedBy`,
`hasReading`, `matching`, `includes`, `isWithin` and `now` answer a
question (`oo-naming-classes-and-methods` rules 1 and 2). The same word
is used once: a *reading* is never a *measurement*, a *hold* is never a
*quarantine*, and a *release* is never a *clear*. No comment is added:
the names carry what the code can say, the range is a value the log
holds, and the deadline is a value `MissingReadingCheck` holds
(`oo-commenting-what-code-cannot` rules 2 and 4). This step changes no
fence.

## Step 7: the review

The review checks the gate and the sizing row first, then reads the
change for the pack's red flags (`oo-reviewing-object-design` rule 1).
It finds no Manager, Helper or Util, no setter on a domain object, no
internal list handed out, no storage type in the domain, and no business
condition in a use case. Nothing in the design changes; this step adds no
fence and no rule.

## The end state

The finished classes are `ReadingRound`, `TemperatureRange`,
`FridgeReading`, `MissingReading` and `MissingReadingCheck` (values and one
enumeration), `FridgeLog` (the one aggregate root), `FridgeLogs` and
`MissingReadings` (the ports), and `RecordFridgeReading`,
`ReleaseFridgeContents` and `ListMissingReadings` (the use cases).
`FridgeLog` holds its readings, range, hold and last release; the write
use cases load and save one log; and the front desk's list is one read
query whose missing rule is `MissingReadingCheck`.

That state keeps `oo-designing-aggregates` rule 1,
`oo-encapsulating-state-and-behaviour` rules 2 and 4,
`oo-making-illegal-states-impossible` rule 1,
`oo-inverting-dependencies` rule 1, `oo-layering-the-system` rule 2 and
`oo-modeling-lifecycles` rule 5; it also keeps the gate's rule, because
the contents stay held from the outside reading until `release` names
the nurse, and no later reading lifts the hold.
