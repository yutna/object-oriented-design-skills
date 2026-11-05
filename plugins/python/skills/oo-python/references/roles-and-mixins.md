# Roles and Mixins

`VisitReminder` and `RecallNotice` are two notices the front desk
prints: one before a visit and one when a recall falls due. Both carry a
patient's name and a due date, and both need the same line. This file
follows one behaviour from a mixin that reads the hosts' attributes to
an object each host holds, named by a `Protocol`.

## The mixin

```python
from datetime import date


class DescribesDueDate:
    patient_name: str
    due_on: date

    def summary(self) -> str:
        return (
            f"{self.patient_name} is due on "
            f"{self.due_on.isoformat()}"
        )


class VisitReminder(DescribesDueDate):
    def __init__(
        self, patient_name: str, due_on: date, visit_kind: str
    ) -> None:
        self.patient_name = patient_name
        self.due_on = due_on
        self.visit_kind = visit_kind


class RecallNotice(DescribesDueDate):
    def __init__(
        self, patient_name: str, due_on: date, clinician: str
    ) -> None:
        self.patient_name = patient_name
        self.due_on = due_on
        self.clinician = clinician
```

In the first fence, `DescribesDueDate` is a mixin that reads
`patient_name` and `due_on` from the class that inherits it (rule 5).
`VisitReminder` and `RecallNotice` each supply those attributes, so the
mixin works only while both classes keep the names; a class with a
different attribute name cannot use it, and a change to either host's
fields can break the mixin. No `Protocol` names the role the mixin
assumes (rule 1). The fence stores nothing: it leaves out where a
reminder or a notice is saved, under which identity, and in which
transaction.

## A worked change

1. Name the role as a `DueLine` protocol with one method,
   `summary(patient_name, due_on)`, as rule 1 asks.
2. Move the visit wording into `VisitDueLine` and the recall wording
   into `RecallDueLine`, so two implementations match that protocol.
3. Give `VisitReminder` and `RecallNotice` a `DueLine` through their
   constructors and forward `summary()` to it, so each class holds the
   behaviour instead of inheriting it, as rule 5 asks.

```python
from dataclasses import dataclass
from datetime import date
from typing import Protocol


class DueLine(Protocol):
    def summary(self, patient_name: str, due_on: date) -> str: ...


@dataclass(frozen=True)
class VisitDueLine:
    visit_kind: str

    def summary(self, patient_name: str, due_on: date) -> str:
        return (
            f"{patient_name} has a {self.visit_kind} visit due on "
            f"{due_on.isoformat()}"
        )


@dataclass(frozen=True)
class RecallDueLine:
    clinician: str

    def summary(self, patient_name: str, due_on: date) -> str:
        return (
            f"{patient_name} is due for recall with "
            f"{self.clinician} on {due_on.isoformat()}"
        )


class VisitReminder:
    def __init__(
        self, patient_name: str, due_on: date, line: DueLine
    ) -> None:
        self._patient_name = patient_name
        self._due_on = due_on
        self._line = line

    def summary(self) -> str:
        return self._line.summary(self._patient_name, self._due_on)


class RecallNotice:
    def __init__(
        self, patient_name: str, due_on: date, line: DueLine
    ) -> None:
        self._patient_name = patient_name
        self._due_on = due_on
        self._line = line

    def summary(self) -> str:
        return self._line.summary(self._patient_name, self._due_on)


visit_line: DueLine = VisitDueLine("follow-up")
recall_line: DueLine = RecallDueLine("Dr Okafor")
```

In the second fence, `DueLine` names the role, and `VisitDueLine` and
`RecallDueLine` each match it without naming it as a base class
(rule 1). `VisitReminder` and `RecallNotice` hold a `DueLine` and send
it their own values, so neither shares an attribute with the behaviour
any more (rule 5). The two classes can change their fields without
breaking the held object, and a third notice supplies its own
implementation of `DueLine`. The fence stores nothing: it leaves out
where a reminder or a notice is saved, under which identity, and in
which transaction. The fence ends with the behaviour in an object each
class holds, so it keeps rule 5.
