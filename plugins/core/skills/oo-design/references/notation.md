# Neutral notation

- [Declarations](#declarations)
- [Enumerations](#enumerations)
- [Members](#members)
- [Fields](#fields)
- [Methods](#methods)
- [Constructors](#constructors)
- [Extension](#extension)
- [Errors](#errors)
- [Bodies](#bodies)
- [Comments and types](#comments-and-types)
- [Complete example](#complete-example)

## Declarations

A `class` names an object with identity: two instances are equal only
when they are the same object. An `interface` names a set of messages
another object answers. A `value` is immutable and compares by value.

```text
class Appointment
interface AppointmentPolicy
value PatientId
```

## Enumerations

An `enum` lists its members on the following lines.

```text
enum AppointmentStatus
  Scheduled
  Cancelled
```

## Members

Members are indented two spaces. `-` marks a private member and `+`
marks a public one.

```text
class Appointment
  - status: AppointmentStatus
  + cancel(reason: CancellationReason): void
```

## Fields

A field is written as `- name: Type` inside its class.

```text
class Appointment
  - status: AppointmentStatus
```

## Methods

A method is written as `+ name(parameter: Type): ReturnType` inside its
class.

```text
class Appointment
  + cancel(reason: CancellationReason): void
```

## Constructors

A constructor is written as `+ new(parameter: Type)` and has no return
type. A constructor parameter with the same name as a field sets that
field.

```text
class Appointment
  + new(slot: Slot, patient: PatientId)
```

## Extension

`extends` and `implements` sit on the declaration line.

```text
class Appointment extends Booking implements Cancellable
```

## Errors

A method that can fail puts `raises Name` on the line under its
signature.

```text
class Slot
  + reserve(patient: PatientId): void
    raises SlotTaken
```

## Bodies

A body is indented under its signature and holds plain statements:
`if … then … else …`, `raise X`, `return x`, a message send, and
construction with `new`. `:=` assigns, `=` compares, `null` is the
absent value of a `Type?`, and `void` means the method returns
nothing. A bare `return` ends a `void` method.

```text
class Appointment
  + cancel(reason: CancellationReason): void
    if status = Scheduled then
      status := Cancelled
      slot.release(patient)
    else
      raise AppointmentNotCancellable
    return
  + book(slot: Slot, patient: PatientId): Appointment
    return new Appointment(slot, patient)
```

## Comments and types

`--` starts a comment. A `Type?` may be absent. `List<Type>` is a
collection.

```text
value CancellationReason
  -- why the appointment was cancelled
  + new(note: String?)
class Clinician
  + appointments(date: Date): List<Appointment>
```

## Complete example

```text
class Appointment
  - slot: Slot
  - patient: PatientId
  - status: AppointmentStatus
  + new(slot: Slot, patient: PatientId)
    slot.reserve(patient)
    status := Scheduled
  + cancel(reason: CancellationReason): void
    if status = Scheduled then
      status := Cancelled
      slot.release(patient)
    else
      raise AppointmentNotCancellable
    return

class Slot
  - clinician: ClinicianId
  - startsAt: DateTime
  - patient: PatientId?
  + reserve(patientId: PatientId): void
    if patient = null then
      patient := patientId
    else
      raise SlotTaken
  + release(patientId: PatientId): void
    patient := null
```

The notation has no other keywords and no semicolons.
