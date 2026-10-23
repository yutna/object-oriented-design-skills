# Object roles

- [Holds information](#holds-information)
- [Structures other objects](#structures-other-objects)
- [Provides a service](#provides-a-service)
- [Coordinates others](#coordinates-others)
- [Controls a flow](#controls-a-flow)
- [Talks to the outside world](#talks-to-the-outside-world)
- [Card walkthrough for booking](#card-walkthrough-for-booking)

A role is a plain-language check, not a type or a label in code. Read a
class and say what it does in one short phrase. A class may hold one or
two roles; a third is a sign to split it or move a responsibility. The
phrases below are prompts, not a fixed taxonomy, and the boundaries
between them are not rules. The count is the useful part.

## Holds information

It owns values other objects ask for, and it keeps the rules that use
those values. A `Patient` holds a name and a date of birth.

```text
class Patient
  - name: PatientName
  - dateOfBirth: Date
  + new(name: PatientName, dateOfBirth: Date)
  + ageOn(date: Date): Age
```

## Structures other objects

It keeps other objects in order or makes a whole from parts. A
`ClinicSchedule` holds the day's appointments.

```text
class ClinicSchedule
  - appointments: List<Appointment>
  + new(appointments: List<Appointment>)
```

## Provides a service

It answers a task that does not belong to one entity. A `BookingService`
turns a slot and a patient into an appointment.

```text
class BookingService
  + book(slot: Slot, patient: PatientId): Appointment
    slot.reserve(patient)
    return new Appointment(slot, patient)
```

## Coordinates others

It directs several objects through a flow and holds the order of steps.
A `VisitCoordinator` removes a patient from triage and books the slot.

```text
class VisitCoordinator
  - triage: TriageQueue
  + new(triage: TriageQueue)
  + checkIn(patient: PatientId, slot: Slot): Appointment
    triage.remove(patient)
    slot.reserve(patient)
    return new Appointment(slot, patient)
```

## Controls a flow

It decides the order of steps for one use case and stops when a step
fails. A `CheckInFlow` reserves the slot before it creates the
appointment.

```text
class CheckInFlow
  + run(patient: PatientId, slot: Slot): Appointment
    slot.reserve(patient)
    return new Appointment(slot, patient)
```

## Talks to the outside world

It translates between the domain and a system outside it, such as a
calendar feed or a message queue. A `CalendarGateway` publishes a booked
appointment.

```text
interface CalendarGateway
  + publish(appointment: Appointment): void
```

## Card walkthrough for booking

Write three lines on a card: class name, responsibilities, collaborators.
Read the card against the code. If a responsibility needs a second card
to explain, or a collaborator appears only to fetch data, the card is not
ready.

- Class: `Appointment`
- Responsibilities: hold the slot and patient chosen for the booking;
  answer whether the booking is scheduled; cancel the booking and
  release the slot.
- Collaborators: `Slot`, `PatientId`.

Read it while booking: `Slot.reserve` takes the slot, the `Appointment`
constructor sets the slot and patient, and the card shows that
cancellation belongs to the same object. If the card also said "remind
the patient", it would need another card and another class.
