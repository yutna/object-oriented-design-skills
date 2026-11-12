# Signals to Direct Calls

This file follows rules 3 and 4 through one change: a radiology request
is scheduled, and the clinic's radiology centre must receive an order for
it. The first version connects a `post_save` receiver that creates the
desk's task and sends the order. The change calls both effects from the
use case: the task is stored in the request's transaction, and the send
waits for that transaction to commit.

- [The types](#the-types)
- [The receiver as it is](#the-receiver-as-it-is)
- [The use case after the change](#the-use-case-after-the-change)

## The types

```python
from datetime import datetime

from django.db import models


class RadiologyRequestExpired(Exception):
    pass


class RadiologyRequestAlreadyScheduled(Exception):
    pass


class RadiologyRequest(models.Model):
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    STATUSES = [
        (REQUESTED, "Requested"),
        (SCHEDULED, "Scheduled"),
    ]

    patient_number = models.CharField(max_length=200)
    kind = models.CharField(max_length=100)
    expires_at = models.DateTimeField()
    _status = models.CharField(
        max_length=20, choices=STATUSES, default=REQUESTED,
        db_column="status")
    _scheduled_at = models.DateTimeField(
        null=True, blank=True, db_column="scheduled_at")

    @property
    def status(self) -> str:
        return self._status

    @property
    def scheduled_at(self) -> datetime | None:
        return self._scheduled_at

    def schedule(self, now: datetime) -> None:
        if self._status != RadiologyRequest.REQUESTED:
            raise RadiologyRequestAlreadyScheduled(self.pk)
        if now > self.expires_at:
            raise RadiologyRequestExpired(self.pk)
        self._status = RadiologyRequest.SCHEDULED
        self._scheduled_at = now

    def add_task(self, due_at: datetime) -> None:
        RadiologyTask.objects.create(
            radiology_request=self, due_at=due_at)


class RadiologyTask(models.Model):
    radiology_request = models.ForeignKey(
        RadiologyRequest, on_delete=models.CASCADE)
    due_at = models.DateTimeField()
    done_at = models.DateTimeField(null=True)
```

`RadiologyRequest` is the Pattern's model, repeated here so both models
sit in one file for reading: it has the same fields, the same errors and
the same `schedule` method, plus an `add_task` method that stores the
task the use case asks for. `RadiologyTask` is one row inside the
radiology request's aggregate: one task for one request, stored in the
radiology task table and reached through the request. The `post_save`
receiver below is connected from the radiology app's `ready()` method,
the method a subclass overrides to perform initialization tasks such as
registering signals; the registration is left out of these fences.

## The receiver as it is

```python
from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .radiology_centre import RadiologyCentre
from .models import RadiologyRequest, RadiologyTask


@receiver(post_save, sender=RadiologyRequest)
def create_radiology_task(sender, instance, **kwargs):
    if instance.status != RadiologyRequest.SCHEDULED:
        return
    RadiologyTask.objects.create(
        radiology_request=instance,
        due_at=timezone.now() + timedelta(days=1))
    RadiologyCentre().send(instance.pk)
```

The receiver runs from every `save()` of an `RadiologyRequest`. When the
request's status is `SCHEDULED`, it decides that a task is due, stores a
task row under the request's identity, and sends the order to the
radiology centre. The status check is a rule, and it sits where no
reader of the use case sees it: the rule is kept in a receiver (rule 4).
A `post_save` runs inside the save, so inside an `atomic()` block it
runs before that block commits. If the transaction rolls back, the task
row goes with it and the send has already left. If the send raises, the
exception leaves `save()`; if the exception leaves the caller's
`atomic()` block, both rows roll back, while in autocommit mode both
rows are already stored. The fence stores a task row under the request's
identity in the radiology task table, in the clinic's database, inside
the caller's transaction when the save runs in one, and sends to the
radiology centre before that transaction commits; in autocommit mode
each statement commits on its own.

## The use case after the change

```python
from datetime import datetime, timedelta

from django.db import transaction

from .radiology_centre import RadiologyCentre
from .models import RadiologyRequest


class ScheduleRadiologyRequest:
    def __init__(self, centre: RadiologyCentre) -> None:
        self._centre = centre

    def __call__(self, radiology_request_id: int, now: datetime) -> None:
        with transaction.atomic():
            radiology_request = (
                RadiologyRequest.objects.select_for_update()
                .get(pk=radiology_request_id))
            radiology_request.schedule(now)
            radiology_request.save()
            radiology_request.add_task(now + timedelta(days=1))
            transaction.on_commit(
                lambda: self._centre.send(radiology_request.pk))
```

`ScheduleRadiologyRequest` is the use case: a plain class that receives
the radiology centre's sender through its constructor and never builds
it. The receiver and the `ready()` import that connects it are deleted;
the use case calls both effects itself. `__call__` opens one `atomic()`
block, loads the request, sends it `schedule`, saves it, sends it
`add_task` with the due time, and registers the send with
`transaction.on_commit()`. The task is stored by the request in the same
transaction as the request itself, so a refusal or a failed write stores
neither row. The send runs only after that transaction
commits; a rollback discards the callback, so no order leaves for a
schedule that was never stored. If the send itself fails after the
commit, the request and the task stay stored and the sender's error
reaches the caller. The fence stores the radiology request row under its
primary key in the radiology request table and the task under the
request's identity in the radiology task table, both in the clinic's
database, inside the one `atomic()` block; it leaves out the transaction
that the caller opened, if any. The state keeps rules 3 and 4: the use
case calls both effects itself, and the outside send waits for the
commit, with no signal receiver holding either one.
