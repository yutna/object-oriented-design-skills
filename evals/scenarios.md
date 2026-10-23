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
booking data; the scheduler and the controller asking that object; one
owner for the rule.

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
