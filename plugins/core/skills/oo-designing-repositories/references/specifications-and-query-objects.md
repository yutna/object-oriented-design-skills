# Specifications and query objects

- [Two more messages on the port](#two-more-messages-on-the-port)
- [A rule that checks one and selects many](#a-rule-that-checks-one-and-selects-many)
- [A search whose criteria combine](#a-search-whose-criteria-combine)
- [When named methods are clearer](#when-named-methods-are-clearer)

Rule 3 stops a repository from growing a general `findBy`, and rule 4
gives two shapes to the searches that remain open. A specification
names one clinic rule and can check a single aggregate and select many.
A query object carries several criteria to the store. Both keep the
clinic's question in the domain and the store's language at the edge.

## Two more messages on the port

The port below keeps the four methods the Pattern shows and adds
`select` for a specification and `search` for a query object; each
implementation translates the two into its store's query, as the
sections below describe.

```text
interface Appointments
  + add(appointment: Appointment): void
  + find(id: AppointmentId): Appointment
    raises AppointmentNotFound
  + forClinicianOn(clinician: ClinicianId, date: Date): List<Appointment>
  + save(appointment: Appointment): void
  + select(specification: AppointmentSpecification): List<Appointment>
  + search(criteria: AppointmentSearch): List<Appointment>
```

`due`, the method the lifecycles skill adds, stands as that skill writes
it. The two new methods return whole appointments, and neither one
answers a row.

## A rule that checks one and selects many

Reception may cancel an appointment only while its slot is more than a
day away; inside that day, the clinician decides. The rule is one
object, and two callers use it: a cancellation checks one appointment,
and a list for the reception desk selects every appointment the rule
still allows.

```text
interface AppointmentSpecification
  + isSatisfiedBy(appointment: Appointment): Boolean

value CancellableByReception implements AppointmentSpecification
  - cutoff: DateTime
  + new(cutoff: DateTime)
  + isSatisfiedBy(appointment: Appointment): Boolean
    return appointment.startsAfter(cutoff)
  + cutoff(): DateTime
    return cutoff
```

`cutoff` is the first moment at which reception may no longer cancel,
and it is built once from the current time plus the clinic's day.
`appointment.startsAfter(cutoff)` is taken to answer that the
appointment is `Scheduled` and its slot starts after `cutoff`, and
`cutoff()` hands the same moment to a store that translates the rule
into its own query. The constructor sets `cutoff` before either method
reads it, and neither method changes anything.

One appointment is checked when reception cancels it:

```text
class ReceptionCancellation
  - appointments: Appointments
  - cancellable: AppointmentSpecification
  + new(appointments: Appointments,
      cancellable: AppointmentSpecification)
  + run(id: AppointmentId, reason: CancellationReason): void
    raises CancellationNeedsClinician
    appointment := appointments.find(id)
    if cancellable.isSatisfiedBy(appointment) then
      appointment.cancel(reason)
      appointments.save(appointment)
    else
      raise CancellationNeedsClinician
    return
```

`ReceptionCancellation` holds the port and the rule, both set by its
constructor. `run` finds the whole appointment, asks the specification,
and either sends `cancel(reason)` once and saves the appointment or
raises `CancellationNeedsClinician`; the two branches never both run.
`AppointmentNotFound` from `find` and `AppointmentNotCancellable` from
`cancel` pass to the caller. What is stored is the whole appointment,
in the `Appointments` store, in the transaction the caller of `run`
opens, and no other aggregate changes.

Many are selected when the reception desk asks which appointments it
may still cancel:

```text
class CancellableAppointments
  - appointments: Appointments
  + new(appointments: Appointments)
  + run(cutoff: DateTime): List<Appointment>
    specification := new CancellableByReception(cutoff)
    return appointments.select(specification)
```

`run` builds the rule once and asks the store for every appointment it
accepts. A database implementation recognizes `CancellableByReception`
and forms one query: the status is `Scheduled` and the slot starts after
`specification.cutoff()`. An in-memory implementation sends
`isSatisfiedBy` to each stored appointment and answers the same list.
The fence changes nothing, so no transaction is opened.

## A search whose criteria combine

The reception desk searches by any mix: a clinician, a date range, a
kind of appointment, or none of them. No single name can say which
combination a caller has in mind, so the criteria travel as one object.

```text
value AppointmentSearch
  - clinician: ClinicianId?
  - from: Date?
  - to: Date?
  - kind: AppointmentKind?
  + new(clinician: ClinicianId?, from: Date?, to: Date?,
      kind: AppointmentKind?)

class FindAppointments
  - appointments: Appointments
  + new(appointments: Appointments)
  + run(criteria: AppointmentSearch): List<Appointment>
    return appointments.search(criteria)
```

The constructor sets the four criteria; an absent criterion is null, so
a caller can leave any of them out. `AppointmentKind` is taken to name
the clinic's kinds of appointment, such as a first visit or a
follow-up. `FindAppointments` holds the port, set by its constructor,
and `run` sends one message. A database implementation turns the
criteria into one query: it adds a condition for each value that is
present, leaves out each one that is null, and passes the values in the
order of the conditions. No caller writes query text or receives a
query builder. An in-memory implementation checks each stored
appointment against the same criteria. The fence changes nothing and
opens no transaction.

## When named methods are clearer

Two or three fixed questions do not earn either shape. `forClinicianOn`
answers one clinician's day, `forSlot` answers the appointments booked
into one slot, and `upcomingFor` answers the next few for one clinician.
Each name says what the clinic asks and which aggregates come back, and
a reader needs no criteria type to use it.

A specification pays when one rule is needed both to check one object
and to select many, so the rule is written once and no caller copies
it. A query object pays when criteria combine freely and the number of
combinations is far larger than the number of useful names. When the
questions are stable and few, keep the named methods, because a name
is the clearest interface a caller can read.
