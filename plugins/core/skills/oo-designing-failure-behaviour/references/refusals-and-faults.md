# Refusals and faults

## Booking's refusals under one base

A booking is refused in the clinic's words. `SlotTaken` says the slot is
already held. A clinician who takes no new patients refuses a booking
with `ClinicianNotTakingPatients`, and a patient who has reached the
booking limit refuses it with `BookingLimitReached`. The module raises
all three under one base, `BookingRefused`. The notation declares
`SlotTaken` alone; this skill groups it under that base, and grouping it
takes no error away from the method that declares it.

A reception screen handles one refusal by its name and the rest by the
base. When `SlotTaken` is raised, the screen offers the next free time.
Any other `BookingRefused` tells the desk to pass the request to the
booking team. A new refusal then needs no edit in the screen until the
desk must treat it differently.

## A port names every refusal

A port lists on its `raises` line each refusal its implementations
raise, by name. The base groups the refusals for a caller that treats
them alike, while the list says which ones a caller may meet. A port
that named only the base would hide the refusals its implementations
raise, and a caller that handles one of them by name would never see it
on the signature it reads.

## A fault is declared once

A fault is a failure no caller can repair: the store does not answer,
or an invariant is found broken. Only the method that raises it itself
declares it, as the notation asks of every `raise`, and the port that
method implements declares it as well. Every method above passes it on
undeclared, up to the one handler at the program's edge. That handler
records the fault and answers a general failure. No layer in between
catches it, because a catch there can only raise it again, and a caller
that reads the second error learns nothing the first did not say.

## Check before the first change

A cancellation method assigned `Cancelled` to the appointment and then
looked for the slot it had to release. The slot was gone, which broke an
invariant, and the method failed after the assignment. The appointment
stayed cancelled with its slot still held, and no caller could see the
half-change. The same method now looks for the slot first and raises
before it assigns the status, so a refused call leaves the appointment
exactly as it was.

## Declared errors in some languages

Where a language makes its callers declare every error that may pass,
the refusals are declared on the signatures that answer them, and a
fault is declared on the way up or carried in one general error at the
edge, which is that language's way of passing it on undeclared.
