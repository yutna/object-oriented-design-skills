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
