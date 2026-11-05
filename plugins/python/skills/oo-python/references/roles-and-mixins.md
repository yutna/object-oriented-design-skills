# Roles and Mixins

`SickNote` and `ReturnToWorkNote` are two certificates a clinician
issues: one says a patient is unfit for work through a date, and one
says when the patient may return. Both carry a patient's name, the date
they name, and the clinician who signs them, and both need a statement
line in the same shape. This file follows one behaviour from a mixin
that reads the hosts' attributes to an object each host holds, named by
a `Protocol`.

## The mixin

```python
from datetime import date


class DescribesCertificate:
    patient_name: str
    on: date
    wording: str
    clinician: str

    def summary(self) -> str:
        return (
            f"{self.patient_name} {self.wording} "
            f"{self.on.isoformat()}, signed by {self.clinician}"
        )


class SickNote(DescribesCertificate):
    def __init__(
        self, patient_name: str, last_day: date, clinician: str
    ) -> None:
        self.patient_name = patient_name
        self.on = last_day
        self.wording = "is unfit for work through"
        self.clinician = clinician


class ReturnToWorkNote(DescribesCertificate):
    def __init__(
        self, patient_name: str, first_day_back: date, clinician: str
    ) -> None:
        self.patient_name = patient_name
        self.on = first_day_back
        self.wording = "may return to work on"
        self.clinician = clinician
```

In the first fence, `DescribesCertificate` is a mixin that reads
`patient_name`, `on`, `wording` and `clinician` from the class that
inherits it (rule 5). `SickNote` and `ReturnToWorkNote` each supply
those attributes, and each supplies its own `wording`, so the two lines
differ in the words between the patient's name and the date. The mixin
works only while both classes keep the names; a class with a different
attribute name cannot use it, and a change to either host's fields can
break the mixin. No `Protocol` names the role the mixin assumes
(rule 1). The fence stores nothing: it leaves out where a certificate
is saved, under which identity, and in which transaction.

## A worked change

1. Name the role as a `CertificateLine` protocol with one method,
   `summary(patient_name, on)`, as rule 1 asks.
2. Move each host's wording and its signing clinician into
   `SickLeaveLine` and `ReturnToWorkLine`, so two implementations
   declare the protocol as their base class; the two lines stay the
   same, because each line keeps the wording its host supplied.
3. Give `SickNote` and `ReturnToWorkNote` a `CertificateLine` through
   their constructors and forward `summary()` to it, so each class
   holds the behaviour instead of inheriting it, as rule 5 asks.

```python
from dataclasses import dataclass
from datetime import date
from typing import Protocol


class CertificateLine(Protocol):
    def summary(self, patient_name: str, on: date) -> str: ...


@dataclass(frozen=True)
class SickLeaveLine(CertificateLine):
    clinician: str

    def summary(self, patient_name: str, on: date) -> str:
        return (
            f"{patient_name} is unfit for work through "
            f"{on.isoformat()}, signed by {self.clinician}"
        )


@dataclass(frozen=True)
class ReturnToWorkLine(CertificateLine):
    clinician: str

    def summary(self, patient_name: str, on: date) -> str:
        return (
            f"{patient_name} may return to work on "
            f"{on.isoformat()}, signed by {self.clinician}"
        )


class SickNote:
    def __init__(
        self, patient_name: str, last_day: date, line: CertificateLine
    ) -> None:
        self._patient_name = patient_name
        self._on = last_day
        self._line = line

    def summary(self) -> str:
        return self._line.summary(self._patient_name, self._on)


class ReturnToWorkNote:
    def __init__(
        self,
        patient_name: str,
        first_day_back: date,
        line: CertificateLine,
    ) -> None:
        self._patient_name = patient_name
        self._on = first_day_back
        self._line = line

    def summary(self) -> str:
        return self._line.summary(self._patient_name, self._on)


sick_line: CertificateLine = SickLeaveLine("Dr Okafor")
return_line: CertificateLine = ReturnToWorkLine("Dr Okafor")
sick_note = SickNote("Ana", date(2026, 5, 19), sick_line)
return_note = ReturnToWorkNote("Ana", date(2026, 5, 20), return_line)
print(sick_note.summary())
print(return_note.summary())
```

In the second fence, `CertificateLine` names the role, and
`SickLeaveLine` and `ReturnToWorkLine` each declare it as a base class
(rule 1), so the checker holds each class to the role's methods.
`SickNote` and `ReturnToWorkNote` hold a `CertificateLine` and send it
their own values, so neither shares an attribute with the behaviour any
more (rule 5). The two classes can change their fields without breaking
the held object, and a third certificate supplies its own implementation
of `CertificateLine`. The fence stores nothing: it leaves out where a
certificate is saved, under which identity, and in which transaction.
The second fence answers the same two lines as the first, with the
behaviour in an object each class holds, so it keeps rule 5.
