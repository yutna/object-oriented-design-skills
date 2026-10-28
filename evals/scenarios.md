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

## 22. The patient table's many doors

> `PatientDao` has `findByName`, `findByNameAndBirthDate`,
> `findByPostcodeAndSurgery`, `updatePhone(id, phone)` and
> `getConnection()`. The booking code calls `updatePhone` directly and
> builds its own query text for the search screen. A new rule says a
> patient's phone number must be confirmed by text message before it is
> used, and nobody can find every place that changes it. How should
> storing and finding patients be designed?

Must contain: one repository for patients that reads like a
collection and hands back whole patients; queries named for the
questions the clinic asks, and a specification or a query object for
the free search; the phone number changed through the patient, which
keeps the new rule, then stored whole; no connection or query text
outside the implementation at the edge.

Should reach `oo-designing-repositories`.

## 23. The controller that knows the rules

> `ReferralController` reads the form, checks that the referring
> clinician may refer to this specialty, checks that the patient has no
> open referral for it, picks the hospital with the shortest wait, saves
> the referral and sends the letter, all in one method of 200 lines. The
> same checks are copied into the nightly import of referrals from a
> partner surgery. Where should each part go?

Must contain: the form read and checked for shape at the edge; one
application service per use case that loads, delegates, stores and sets
the transaction; the referral's own rules on the referral and, where a
rule needs several aggregates, such as the choice of hospital, a
domain service named for that activity; the controller and the import
both calling the same application service, so each rule lives once.

Should reach `oo-placing-domain-logic`.

## 24. Results that wait for the pager

> When a lab result marked abnormal arrives, `ResultIntake.record`
> saves it, adds it to the patient's chart, pages the on-call clinician
> and books a follow-up appointment, all inside one transaction. Last
> week the paging service was down for an hour, and no result could be
> recorded at all. On other days a page went out and the transaction
> then rolled back, so clinicians were paged about results that were
> never saved. What should change?

Must contain: recording the result as one change that records a
past-tense event, such as an abnormal result received; the page, the
chart entry and the follow-up each run as their own handler after the
result commits, each in its own transaction; the event stored with the
result in one transaction and sent from there afterwards, so no page
goes out for an unsaved result and none is lost; each handler safe to
run twice, so a repeated event books no second follow-up.

Should reach `oo-publishing-domain-events`.

## 25. Everyone's patient

> Reception, the pharmacy and the research team all use one `Patient`
> class with 60 fields. Reception needs contact details, the pharmacy
> needs allergies and a dispensing history, and research needs consent
> flags and a pseudonymous id. Every release needs all three teams to
> agree, and last month a research change broke the pharmacy's allergy
> check. Research also wants to buy an outside consent tool. How should
> we divide this?

Must contain: a context for each team's meaning of a patient, each with
its own model and the data it changes, linked by the patient's
identity; how the contexts relate, written down, with a translation at
the edge of a context that depends on another's model or on the bought
tool; which parts are core decided by where the clinic differs, with
the consent tool treated as generic and kept behind a translation.

Should reach `oo-bounding-contexts`.

## 26. Every test starts the web server

> Our booking code lives in classes that extend the web framework's
> controller base class, and `Appointment` extends the storage
> library's record class so it can save itself. The automated phone
> line books by sending a fake web request to reuse that code. Every
> test starts the web server and a database, and the suite takes forty
> minutes. A partner now wants to book through an API of its own. How
> should the code be arranged?

Must contain: dependencies that point inward to a domain free of web and
storage types, so `Appointment` no longer extends the record class; one
use-case object per operation that the web controller, the phone line
and the partner API all call; adapters at the edge for the web, the
store, the phone line and the partner API, kept humble; the domain and
the use cases tested with no server and no database.

Should reach `oo-layering-the-system`.

## 27. Four folders and a tangle

> Our clinic app keeps 400 classes in four folders: `controllers`,
> `services`, `models` and `utils`. A change to prescriptions touches
> all four. `models` imports `services` in three places while `services`
> imports `models` everywhere, so no part can be built or tested alone,
> and `utils` changes in almost every release. The team wants to split
> the app into microservices to fix this. What should we do first?

Must contain: modules by business area, such as prescriptions, each
with a small public interface and the rest internal; the import cycle
found and broken by moving a class, by an interface the depending
module owns, or by an event; the much-used `utils` split up or made
stable; the boundaries checked in the build; a modular monolith before
any split into services, and a split only for a module that must be
deployed, scaled or owned apart.

Should reach `oo-organising-modules`.
