# A worked example of an anti-corruption layer

- [The question the clinic asks](#the-question-the-clinic-asks)
- [The regulator's model](#the-regulators-model)
- [The state before the translator](#the-state-before-the-translator)
- [The clinic's side of the edge](#the-clinics-side-of-the-edge)
- [The end state](#the-end-state)

## The question the clinic asks

The clinic says:

> Before a clinician's day begins, the manager wants to know whether
> this clinician may hold visits today, and which conditions the
> regulator attaches. The regulator publishes an entry for a clinician
> whenever it changes that clinician's status or conditions, with the
> date that entry takes effect, a status in the regulator's own code,
> and any conditions in free text. We cannot change the regulator's
> model. Show the manager the answer in the clinic's words. If the
> answer is one we do not understand, say so, and let the manager
> decide by hand. Moving a clinician's visits is the manager's own step.

The clinic depends on a model it does not control. `oo-bounding-contexts`
rule 4 asks for one translator at the depending context's edge, and this
example builds it. The exception in that rule does not fit: the clinic
is not content to adopt the regulator's whole model, because its codes,
its effective dates and its free-text conditions do not answer the
clinic's question. The clinic needs its own answer to its own question.

No fence here stores anything or changes the clinic's data. The example
answers a read the manager asks before the day's visits; reassigning a
clinician's visits stays a manual step, and no fence books, moves or
cancels an appointment.

## The regulator's model

The regulator is a national body that regulates clinicians. Its client
and its records are invented for this example, and no real regulator is
named. `RegulatorFeed` answers the entry in force on a day, or `null`
when the regulator lists nothing for that licence and day;
`entryFor` raises `RegulatorUnreachable` when the regulator does not
answer. `RegulatorEntry` carries the regulator's status code in
`statusCode`, the date its entry starts in `effectiveFrom`, and its
conditions as free text in `restrictions`. Codes `"A1"` and `"S2"` are
the regulator's active and suspended codes; it may publish others.

```text
-- the regulator's model, as it arrives
class RegulatorEntry
  - statusCode: String
  - effectiveFrom: Date
  - restrictions: List<String>
  + new(statusCode: String, effectiveFrom: Date,
      restrictions: List<String>)
  + statusCode(): String
    return statusCode
  + effectiveFrom(): Date
    return effectiveFrom
  + restrictions(): List<String>
    return restrictions

interface RegulatorFeed
  + entryFor(licence: String, day: Date): RegulatorEntry?
    raises RegulatorUnreachable
```

The entry's constructor sets its three fields before `statusCode`,
`effectiveFrom` or `restrictions` read them. `entryFor` answers the
entry whose `effectiveFrom` is the latest on or before `day`, or `null`
when no entry covers the day; the regulator's own client selects the
entry, so the translator never chooses a date. When the regulator does
not answer, `entryFor` raises `RegulatorUnreachable` and no entry is
returned. The model does not fit the clinic's: its codes are not the
clinic's words, a licence is not a `ClinicianId`, its conditions are a
list of free text under a field named `restrictions`, and it never says
whether a clinician may hold visits. The fence stores nothing.

## The state before the translator

Before the layer, the clinic's `DayRoster` holds the regulator's entry
and reads it directly. This is the state before the translator.

```text
-- the state before the translator
class DayRoster
  - clinician: ClinicianId
  - regulatorEntry: RegulatorEntry
  + new(clinician: ClinicianId, regulatorEntry: RegulatorEntry)
  + mayHoldVisits(day: Date): Boolean
    if regulatorEntry.statusCode() = "A1" then
      if regulatorEntry.effectiveFrom().isAfter(day) then
        return false
      else
        return true
    else
      return false
  + conditions(): List<String>
    return regulatorEntry.restrictions()
```

The constructor sets both fields before `mayHoldVisits` or `conditions`
read them. `effectiveFrom.isAfter(day)` is taken to mean the entry
starts after the day. `mayHoldVisits` reads the regulator's code `"A1"`
and its `effectiveFrom`: when the code is `"A1"` and the entry starts
after `day`, it answers `false`, and when the entry has started it
answers `true`; any other code answers `false`. `conditions` hands out
the regulator's `restrictions` list. The clinic class holds the
regulator's model and the clinic's answer in one place. A second
regulator code changes this clinic class, and a code nobody here knows
answers `false` with no way to tell a suspended clinician from one the
clinic did not understand. The regulator's field names sit in the
clinic's code, so a rename reaches it too. The fence stores nothing and
changes nothing.

## The clinic's side of the edge

The clinic's concept is `PractisingStatus`: the clinic's word for
whether a clinician may hold visits, together with the conditions the
manager must see. Its state is one of four clinic states. `Unrecognised`
says the regulator used a code the translator does not know, and
`NotListed` says the regulator has no entry for the clinician on the
day. `LicenceNumber` is the clinic's value for the number the regulator
prints on its entries; its constructor sets the text, and `text` returns it.

```text
-- domain
enum PractisingState
  Permitted
  Suspended
  Unrecognised
  NotListed

value LicenceNumber
  - text: String
  + new(text: String)
  + text(): String
    return text

value PractisingStatus
  - state: PractisingState
  - conditions: List<String>
  + new(state: PractisingState, shown: List<String>)
    conditions := shown.copy()
  + state(): PractisingState
    return state
  + conditions(): List<String>
    return conditions.copy()
  + mayHoldVisits(): Boolean
    if state = Permitted then
      return true
    else
      return false
```

`PractisingStatus.new` copies the conditions list it is given, and
`conditions` copies the list it hands out, so no change to the
regulator's list or to a caller's copy reaches the value's state
(`oo-encapsulating-state-and-behaviour` rule 6). Every field is set by
the constructor before a method reads it, and no method changes a
field. `mayHoldVisits` answers `true` only for `Permitted`; that is the
clinic's rule, and it lives here, not in the translator. What the
manager does with any other state belongs to the manager; this example
leaves that step out, and no fence books, moves or cancels an
appointment.

The clinic's port `PractisingCheck` answers in the clinic's own types
and declares the one error its implementation raises.

```text
-- domain
interface PractisingCheck
  + statusFor(clinician: ClinicianId, day: Date): PractisingStatus
    raises PractisingStatusUnavailable

interface ClinicianLicences
  + licenceFor(clinician: ClinicianId): LicenceNumber?
```

`PractisingCheck` is the clinic's port; no signature on this side names
a regulator type, a regulator field or a regulator code.
`ClinicianLicences` is the clinic's own lookup for the licence number
it holds for a clinician, and it answers `null` when the clinic has
none. The port declares `PractisingStatusUnavailable`; the translator
raises nothing the port does not declare. Both fences store nothing.

The one translator implements the port, and it only translates.

```text
-- adapters
class RegulatorTranslator implements PractisingCheck
  - feed: RegulatorFeed
  - licences: ClinicianLicences
  + new(feed: RegulatorFeed, licences: ClinicianLicences)
  + statusFor(clinician: ClinicianId, day: Date): PractisingStatus
    raises PractisingStatusUnavailable
    licence := licences.licenceFor(clinician)
    if licence = null then
      raise PractisingStatusUnavailable
    else
      entry := feed.entryFor(licence.text(), day)
      if entry = null then
        return new PractisingStatus(NotListed, new List<String>())
      else
        if entry.statusCode() = "A1" then
          return new PractisingStatus(Permitted, entry.restrictions())
        else
          if entry.statusCode() = "S2" then
            return new PractisingStatus(Suspended,
              entry.restrictions())
          else
            return new PractisingStatus(Unrecognised,
              entry.restrictions())
```

In the end state, regulator terms appear in one clinic class:
`RegulatorTranslator` names `RegulatorFeed`, `entryFor`, `statusCode`,
`restrictions` and the codes `"A1"` and `"S2"`. The type
`RegulatorEntry` and the field `effectiveFrom` sit in the regulator's
model and in the state before the translator; the translator reaches an
entry through `entryFor`. Its constructor sets both collaborators
before `statusFor` reads them. `statusFor` first asks the clinic's
licence lookup once; when the clinic has no number, it
raises `PractisingStatusUnavailable` before it calls the regulator.
Otherwise it asks the regulator once for the entry on the day and
answers `NotListed` when the regulator has no entry, `Permitted` for
code `"A1"`, `Suspended` for `"S2"`, and `Unrecognised` for any other
code. The conditions go into the clinic's value, which copies them. No
call with an effect runs twice. The translator decides no clinic rule:
it never asks `mayHoldVisits`, and it does not choose what the manager
does with a status. When `entryFor` raises `RegulatorUnreachable`, the
regulator client's own error, the translator turns it into
`PractisingStatusUnavailable`, so no clinic caller ever names it; this
fence leaves that turn out because the notation has no way to catch an
error. The fence stores nothing.

## The end state

`DayRoster` now asks the clinic's port and reads the clinic's status.
It names no regulator term.

```text
-- application
class DayRoster
  - check: PractisingCheck
  + new(check: PractisingCheck)
  + statusFor(clinician: ClinicianId, day: Date): PractisingStatus
    raises PractisingStatusUnavailable
    return check.statusFor(clinician, day)
  + mayHoldVisits(clinician: ClinicianId, day: Date): Boolean
    raises PractisingStatusUnavailable
    return statusFor(clinician, day).mayHoldVisits()
  + conditionsFor(clinician: ClinicianId, day: Date): List<String>
    raises PractisingStatusUnavailable
    return statusFor(clinician, day).conditions()
```

The constructor sets `check` before the queries read it. Each query asks
the port once and reads the clinic's answer: `mayHoldVisits` sends the
clinic's decision to `PractisingStatus`, and `conditionsFor` copies the
list out for the manager. When the port raises
`PractisingStatusUnavailable`, the fence shows the call and the declared
error leaving `DayRoster`; the screen catches it at the framework edge
and shows the manager that the clinic could not get an answer. The
manager then checks the clinic's record and the regulator's site, and
moves the visits by hand; no fence books, moves or cancels an
appointment or a slot. The fence stores nothing and changes nothing.

The clinic's side is `PractisingState`, `PractisingStatus`,
`LicenceNumber`, `PractisingCheck` and `ClinicianLicences`;
`RegulatorTranslator` is the one translator, and its collaborators
arrive through its constructor. In the end state, no clinic class
beyond it names the regulator's model. That state keeps
`oo-bounding-contexts` rule 4,
`oo-inverting-dependencies` rules 1 and 2, `oo-layering-the-system`
rules 2 and 3 and `oo-encapsulating-state-and-behaviour` rule 6, and it
keeps the clinic's rule: a clinician holds visits only while the
clinic's status is `Permitted`, and every other status goes to the
manager, who moves the visits by hand.
