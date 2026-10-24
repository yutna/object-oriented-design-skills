# Scenarios

Each scenario is a problem a clinic team might bring, written in the words
they would use. Paste one scenario as the whole prompt into a session with
the pack installed.

The "Must contain:" lists name the substance a good answer needs, not the
wording it must use. An answer that reaches the same place by another
route passes.

## 1. The slot rule keeps moving

> Our `AppointmentScheduler` checks `slot.patientId` before it books,
> and the appointment controller repeats the same check. We keep finding
> new places that decide whether a slot is taken. Where should that
> decision live?

Must contain: the check moving to the object that holds the slot's
booking data; neither the scheduler nor the controller deciding it from
the slot's fields itself; one owner for the rule.

Should reach `oo-assigning-responsibilities`.

## 2. The visit class that does everything

> Our `Visit` class books the appointment, prints the intake form and
> sends the reminder. A change to one job breaks the tests for another,
> and nobody can change one without reading all three. What should we do?

Must contain: the three jobs split along the kinds of change; each job
landing on a separate object; the visit data staying with the visit; no
single class left owning all three.

Should reach `oo-assigning-responsibilities`.

## 3. A one-line fix that needs no redesign

> `Appointment.total()` forgets the patient's insurance discount, so
> every invoice is too high. The method already has the pricing data and
> the fix is one line. A teammate wants to extract a pricing service and
> a discount class. Should I go along?

Must contain: changing the method body and stopping there; keeping the
existing owner; no service, new class or redesign. The sizing table's
one-method row skips remodelling.

Should reach `oo-design`.

## 4. The change that touches everything

> Every time we change how a slot is booked, we also edit the reminder
> sender, the invoice builder and two reports. Our
> `reminders.send(appointment, 2, true)` call has a number and a flag
> that nobody remembers. How do we tell how tightly these parts are
> tied, and what should we loosen first?

Must contain: naming the ties present (the call's positional number
and flag, and the parts that change together); replacing the number
and the flag with a named value or type; using what changes together
in the history as evidence before restructuring; loosening the
strongest, most widespread tie first.

Should reach `oo-diagnosing-coupling`.

## 5. Getters, setters and a form every clinic defines

> Our `Patient`, `Appointment` and `Slot` classes only have getters and
> setters, and `BookingService` holds every booking rule. A colleague
> says this is an anemic model and we must move everything into the
> classes. Our intake form, though, has questions that each clinic
> defines in its settings. What should change, and what should not?

Must contain: the model is a problem where booking rules have no home,
so those rules move to the objects whose data they read; the
clinic-defined intake form stays data (answers plus a schema) rather
than a class per form.

Should reach `oo-deciding-object-or-data`.

## 6. A reminder channel every month

> We added text-message reminders last month and app reminders this
> week, and each time we edited `ReminderService` in five places.
> Product says a chat app is next. A teammate wants a plugin framework
> with a registry for every kind of message the clinic sends. What
> should we do?

Must contain: isolating the reminder channel, the part that has
changed twice, behind one interface; the next channel then adds one
class instead of editing working code; no framework for the kinds of
message that have not varied.

Should reach `oo-encapsulating-what-varies`.

## 7. A cancelled appointment came back

> Our `Appointment` has public setters. The controller checks
> `getStart()` and `getStatus()` and then calls
> `setStatus(CANCELLED)`, and the reports module sometimes adds notes
> to `appointment.getNotes()` directly. Last week a cancelled
> appointment came back as booked. How should we fix the class?

Must contain: replacing the status setter with a cancel method that
checks the rule itself; callers telling the appointment instead of
reading its state and deciding; no longer handing out the internal
notes list (an add method or a read-only view instead).

Should reach `oo-encapsulating-state-and-behaviour`.

## 8. Slots that end before they start

> We build a `Slot` with `new Slot()` and then call `setStart`,
> `setEnd` and `setClinician`. Twice this month a slot ended before it
> started, and once one had no clinician. Some slots repeat weekly,
> and the constructor for those already takes eight arguments. How
> should we build slots?

Must contain: the slot built complete in one step, rejecting an end
before its start at that moment; no setters needed after creation;
named factory methods for the one-off and the weekly case instead of a
long constructor.

Should reach `oo-constructing-valid-objects`.

## 9. The address that moved two patients

> A `Patient` holds an `Address` object with setters. When one patient
> in a family moved, we called `address.setStreet(...)` and her
> brother's record moved too, because both patients held the same
> `Address`. Our duplicate check compares patients by name and birth
> date, and last month it merged two different people. How should we
> model addresses and patient identity?

Must contain: the address as an immutable value, so a move gives that
patient a new address and changes no one else; patients compared by a
stable identifier, never by name and birth date.

Should reach `oo-modeling-values-and-entities`.

## 10. Telehealth visits billed for a room

> `TelehealthVisit` extends `Visit` and overrides `roomCharge()` to
> return zero. Last sprint someone changed `Visit.fee()` to add the
> room's price directly instead of calling `roomCharge()`, and every
> telehealth patient was billed for a room. `TelehealthVisit` also
> inherits `assignRoom()`, which makes no sense for it. Should
> telehealth visits keep extending `Visit`?

Must contain: the subclass broke because it relied on which of its
parent's methods call which; a telehealth visit is not a kind of
visit where rooms are concerned; reuse the shared fee rules by holding
a collaborator instead of extending `Visit`.

Should reach `oo-choosing-composition-over-inheritance`.

## 11. Group sessions that confuse the booking desk

> `GroupSession` extends `Slot` so a physiotherapy class can take up to
> eight patients. After `reserve`, a `Slot` used to be taken; a group
> session stays open until its eighth patient. The booking desk shows a
> group session as full after one booking, and the overbooking report
> counts every group session as seven double bookings. The desk now
> checks whether it holds a `GroupSession` in three places. What should
> we change?

Must contain: `GroupSession` breaks what `Slot` promises after
`reserve`, so it cannot stand in for a `Slot`; the type checks are the
symptom, not the fix; either `Slot`'s contract changes for every slot,
with every caller updated, or `GroupSession` stops extending `Slot`.

Should reach `oo-honouring-substitutability`.

## 12. Five methods, one status ladder

> `Appointment` has a `status` field with five values. `reschedule`,
> `cancel`, `checkIn`, `markNoShow` and `invoice` each start with the
> same chain of `if status == ...` branches. Adding `Tentative` last
> month meant editing all five, we missed `invoice`, and a tentative
> appointment was billed. How should we structure this?

Must contain: one object per status that answers the actions for that
status, or a closed set of statuses whose every action the compiler
checks; the appointment delegating to its current status; a new status
added in one place, with nothing left for a missed branch.

Should reach `oo-replacing-conditionals-with-polymorphism`.

## 13. Eleven classes for one move

> `ReminderSender.remind(appointment)` calls
> `appointment.patient().contactDetails().preferredChannel().send(text)`.
> When the preferred channel moved from the patient to the contact
> details, eleven classes that reach through patients this way had to
> change. How should `remind` get what it needs?

Must contain: `remind` no longer reaches through the appointment to
the patient's contact details; it is given, or asks one nearby object
for, what it uses; a change to where the channel lives touches only
the classes next to it.

Should reach `oo-limiting-what-an-object-knows`.

## 14. The manager nobody can describe

> `ClinicManager` has `doAll()`, `update(flag)`, `getData()` and
> `checkIt()`. New developers keep asking what `doAll()` does: it books
> the slot, emails the patient and writes an audit row. `getData()` also
> marks the patient as seen. What should we rename, and what has to
> change before a rename can help?

Must contain: `getData()` hides a change of state, so it becomes a
command named for that change, apart from any query; `doAll()` and the
manager have no single honest name, so their jobs are split first; each
new name says what its class is or what its method does.

Should reach `oo-naming-classes-and-methods`.

## 15. Twenty-two methods for one lookup

> `ClinicCalendar` is an interface with twenty-two methods. The check-in
> kiosk only asks for a patient's next appointment, yet every change to
> the calendar's billing methods makes the kiosk team rebuild and
> retest, and their test stand-in has to answer all twenty-two. How
> should we change this?

Must contain: split the interface by its callers' roles, so the kiosk
depends only on a next-appointment query; the class behind it may keep
implementing every role; each test stand-in then answers only the role
it replaces.

Should reach `oo-designing-interfaces`.

## 16. Tests that need the production database

> `InvoiceService` calls `Database.instance().query(...)` and
> `PaymentGateway.getInstance().charge(...)` inside its methods. Its
> tests run only against a copy of the production database and the
> payment provider's sandbox, so nobody runs them before a merge. How
> should we restructure it?

Must contain: `InvoiceService` receives what it needs through its
constructor instead of fetching globals; it depends on interfaces it
declares, which adapters for the database and the gateway implement; one
composition root builds the real objects, and tests pass stand-ins.

Should reach `oo-inverting-dependencies`.

## 17. Six classes that speak the lab's format

> Six classes send orders to the outside lab, and each builds the
> message itself: patient id, test code and date joined with `|` in a
> fixed order. The lab added a priority field after the test code, and
> all six broke on the same day. Two of them also read the lab's error
> codes and retry on `E42`. What should change?

Must contain: one module owns the lab's message format and error codes
as its secret, and the six classes ask it to send an order in their own
terms; the lab's errors become the clinic's at that module's edge; the
next format change touches only that module.

Should reach `oo-hiding-implementation`.

## 18. Doses given and refused

> A `DoseRecord` has `given`, `refused` and `deferred` booleans, an
> optional `batchNumber` and an optional `refusalReason`. A report found
> doses marked both given and refused, and given doses with no batch
> number. Code that reads a dose record first checks for combinations
> that should never happen. How should we model this?

Must contain: one type per real state of a dose, each holding only its
own data with every field required, so the forbidden combinations
cannot be built; the states marked as a closed set; the checks for
impossible combinations removed.

Should reach `oo-making-illegal-states-impossible`.

## 19. The imaging team speaks another language

> The imaging team talks about vetting a scan request, protocolling it,
> sending a request back to the referrer and adding an addendum to a
> report. The code has `ImgReq` with `type = 2`, `process()` and
> `flag2`. Every planning meeting starts with someone translating. A
> radiographer asked what happens when a request is sent back, and
> nobody could find it in the code. How do we bring the code and the
> radiographers' words together?

Must contain: classes and methods named with the radiographers' words,
such as a scan request that is vetted and protocolled; sending a
request back given a place of its own in the code, holding its rule;
the type code and the flag replaced by named states or types; the
agreed words written down with the radiographers and used in the code.

Should reach `oo-speaking-the-domain-language`.

## 20. The clinician who holds everything

> Our `Clinician` object holds every slot, appointment, leave day and
> rota note for the year. Booking one slot loads all of it and takes
> seconds. When two receptionists book different slots for the same
> clinician, the second save fails with a conflict, although the two
> bookings have nothing to do with each other. What should change?

Must contain: each aggregate drawn around a rule that must hold at
every change, not around everything a clinician is related to; smaller
aggregates, such as a clinician's day, changed and saved apart; other
aggregates referred to by identity, such as a `ClinicianId`; one
aggregate changed in one transaction.

Should reach `oo-designing-aggregates`.

## 21. Invoices that come back to life

> An `Invoice` has a `status` string: draft, issued, paid or written
> off. The billing screen, the payment import and a nightly job each set
> it. Reports show paid invoices that were edited afterwards, invoices
> written off and then paid, and drafts that went straight to paid. Each
> place checks the status in its own way before it changes it. How
> should the invoice's life be modelled?

Must contain: the invoice's states and the transitions between them
written down; one method per transition on the invoice, each refusing a
move its current state does not allow; no code outside the invoice
setting the status; paid and written off kept final, or undone only by
a named transition with its own rule.

Should reach `oo-modeling-lifecycles`.
