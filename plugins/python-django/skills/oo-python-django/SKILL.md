---
name: oo-python-django
description: Use when a Django project's models, views or signals carry business rules, or its apps are being drawn as boundaries.
license: MIT
metadata:
  version: 0.17.1
  pack: object-oriented-design-skills
---

# Designing Objects in Django

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what Django changes on top of `oo-python`: load
that skill too, because its rules on protocols, frozen dataclasses and
state kept behind its class still hold in a Django code base. Django
supplies an object-relational mapper whose model classes stand for
rows and save themselves, forms and views at the edge, signal receivers
that run when a model is saved, and apps that may import each other's
models. Each of those offers a place to keep a decision that belongs to
the domain: a `clean()` method that `save()` never runs, a view that
sets a guarded field, a bulk update that writes behind every model
method, a signal receiver that holds a reaction, and apps that import
each other's models until no boundary is left. Django 6.1 on Python
3.12 or later changes where these rules are kept, not what they
require.

## When to use

- A rule that guards a status change sits in `clean()`, a view or a
  form, and a `save()` path reaches the field without it.
- A view, a management command or a script changes a guarded field with
  `QuerySet.update()`, `bulk_update()` or `bulk_create()`.
- A `pre_save` or `post_save` receiver writes another model, sends to
  another system, or holds a rule.
- A view or a form decides whether a change is allowed, or one request
  opens several saves.
- Two apps import each other's models, or one app reads another app's
  table as its own.
- A filter chain is repeated in views instead of named on a manager or
  a `QuerySet`.

## When not to use

- The code is plain Python that imports nothing from Django, which
  `oo-python` covers.
- The question is how a template or a front-end component splits its
  state from the domain: outside this skill, and
  `oo-separating-presentation-from-domain` covers the core rule.
- A question no Django feature changes, such as which object owns a
  rule: the core skills, starting from `oo-design`.

## Core rules

1. Rule. **Keep a rule that guards a state change in a model method
   named for the action, which takes the time it needs as a parameter
   and checks before it changes anything, because `save()` never runs
   `full_clean()`, so a rule that lives only in `clean()` holds only
   for forms, as `oo-working-within-a-framework` rule 1,
   `oo-encapsulating-state-and-behaviour` rules 1 and 3,
   `oo-designing-failure-behaviour` rule 4 and
   `oo-designing-for-testability` rule 3 ask.** `save()` runs neither
   `full_clean()` nor `clean()`, the hook for validation that needs more
   than one field; a `ModelForm` runs the model's validation for the
   fields the form holds, so a rule in `clean()` refuses a form's
   invalid input and lets a script, a view that assigns a field, or a
   bulk write past it. A model method such as `schedule(now)` reads the
   current state, refuses the call in the clinic's words before it
   assigns anything, and writes only when the rule holds; the time it
   decides with arrives as a parameter, so a test passes the time it
   chooses.

2. Rule. **Never change state that a rule guards with
   `QuerySet.update()`, `bulk_update()` or `bulk_create()`, which call
   no `save()` and send no `pre_save` or `post_save`, as
   `oo-designing-repositories` rule 6 asks.** `update()` runs an SQL
   update for the rows it matches, `bulk_update()` saves its changes
   through the same SQL path, and `bulk_create()` inserts its list in
   one query; none of the three calls the model's `save()`, and none
   sends either save signal. A model method that every ordinary path
   calls therefore never sees these writes, so the guarded field can
   move from one value to another with no check. A new row is no
   safer: `bulk_create()` inserts it with no call to the model's
   `save()`. Change the aggregate by loading it, sending its root the
   action and saving it whole.

3. Default. **Let a view or a form check a request's shape, and run the
   use case in a plain function or class that opens
   `transaction.atomic()`, loads, sends the command and saves, and
   hands work for other systems to `transaction.on_commit()`, as
   `oo-placing-domain-logic` rules 2 and 5,
   `oo-publishing-domain-events` rule 3 and
   `oo-working-within-a-framework` rule 2 ask.** A view that loads a
   model, checks its state and saves it keeps the use case at the edge:
   a test needs a request to run it, and a second entry point cannot
   reach it. A plain function or class takes the identifiers and
   values, opens one `atomic()` block, loads the aggregate, sends it
   the command, saves it and returns; `atomic()` works as a decorator
   and as a context manager, and rolls the block back when an exception
   leaves it. Work for another system waits for the commit:
   `transaction.on_commit()` runs its callback after the transaction
   commits, discards it on rollback, and runs it at once when no
   transaction is open.

   The exception is an entry point that changes one row through one
   model method and hands nothing to another system, whether a view or a
   plain function the view calls: it may call that method and save,
   because autocommit mode commits the row's statement as it runs and
   there is no second change to coordinate.

4. Rule. **Put no business rule in a signal receiver: call the code
   that reacts directly, as `oo-working-within-a-framework` rule 1
   asks.** A `post_save` receiver runs from `save()`: inside an
   `atomic()` block it runs before that block commits, and it runs on
   every save path, including one whose transaction later rolls back.
   A receiver that writes another model or sends to another system
   makes that effect happen wherever the save runs, and can send word
   of a change that was never stored. It also hides the reaction from
   the use case and from a test that calls the model method. Django's
   signal guide says to opt for directly calling the handling code
   rather than dispatching through a signal. The use case calls the
   second model's change and the outside send itself: the first inside
   its transaction, the second after the commit, as rule 3 says.

5. Judgement. **Treat an app as a module with a public interface:
   other apps call its functions rather than import its models, and an
   app that is a context of its own refers to another app's rows by
   identity rather than a `ForeignKey`, as
   `oo-organising-modules` rule 6, `oo-bounding-contexts` rule 2 and
   `oo-designing-aggregates` rule 3 ask.** A Django application is a
   Python package that provides some set of features, not a boundary by
   itself: two apps whose models share one lifecycle may sit inside one
   context, and an app is a context only while its own model, its own
   words and its own rules stay inside it. Django makes the reach easy:
   a model can take another app's class as a `ForeignKey`, either by
   importing it or by naming it lazily as `"app_label.ModelName"`, and
   the migration writes a foreign key between the tables. Another app
   then reads and writes rows its own rules do not govern. Publish the
   functions other apps may call, keep the models inside, and store
   another context's identity as a value with no foreign key, then load
   what it names through the owning app's interface.

6. Default. **Name a table-level query for the question the domain
   asks, as a custom manager or `QuerySet` method, rather than a filter
   repeated in views, as `oo-designing-repositories` rule 3 and
   `oo-layering-the-system` rule 6 ask.** A filter chain in a view
   spells the question at the edge, so each caller writes its own
   version and a change to the question touches every view. A manager
   method is where Django's guide puts table-level functionality, and
   `QuerySet.as_manager()` or `Manager.from_queryset()` gives the
   manager and the queryset one set of query methods, so
   `RadiologyRequest.objects.due_today()` answers the question from
   either. A model method is for one row, not a table, which is why the
   same guide keeps row-level rules on the model.

   The exception is a read of one row already named by its identity,
   such as a detail screen loading the request whose primary key the
   request carries: it needs no manager method, because the identity
   already names the row and the read decides no rule.

## Pattern

`RadiologyRequest` asks the clinic's radiology centre to take a scan for a
patient. Its status is guarded: only a requested scan may be
scheduled, and a request carries the moment it expires. The first
fence is a view that decides both rules and writes the status itself,
beside a second path that writes the same field with `update()`. The
second and third fences move the check into the model's action method
and call it from both paths.

Before:

```python
from django.http import HttpResponse
from django.utils import timezone

from .models import RadiologyRequest


def schedule_radiology_request(request, pk):
    try:
        radiology_request = RadiologyRequest.objects.get(pk=pk)
    except RadiologyRequest.DoesNotExist:
        return HttpResponse("no radiology request", status=404)
    now = timezone.now()
    if radiology_request.status != RadiologyRequest.REQUESTED:
        return HttpResponse("already scheduled", status=409)
    if now > radiology_request.expires_at:
        return HttpResponse("expired", status=409)
    radiology_request.status = RadiologyRequest.SCHEDULED
    radiology_request.scheduled_at = now
    radiology_request.save()
    return HttpResponse("scheduled")


def schedule_from_waitlist(pk):
    RadiologyRequest.objects.filter(pk=pk).update(
        status=RadiologyRequest.SCHEDULED)
```

In the Before, `RadiologyRequest` is the model whose `status` a rule
guards. `schedule_radiology_request` is the first path: it reads the
status and the expiry, decides both rules, and assigns the two fields
before it saves, so the rule lives in a view (rule 1). The second path,
`schedule_from_waitlist`, writes the guarded status with `update()`, at
the SQL level, so no check runs on that path at all (rule 2). The first
path stores a radiology request row under its primary key in the
radiology request table, with one `save()`; the second path stores the
same row with one SQL update. Neither path opens a transaction of its
own.

After, the model:

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
    status = models.CharField(
        max_length=20, choices=STATUSES, default=REQUESTED)
    scheduled_at = models.DateTimeField(null=True, blank=True)

    def schedule(self, now: datetime) -> None:
        if self.status != RadiologyRequest.REQUESTED:
            raise RadiologyRequestAlreadyScheduled(self.pk)
        if now > self.expires_at:
            raise RadiologyRequestExpired(self.pk)
        self.status = RadiologyRequest.SCHEDULED
        self.scheduled_at = now
```

After, both paths:

```python
from django.http import HttpResponse
from django.utils import timezone

from .models import (
    RadiologyRequest,
    RadiologyRequestAlreadyScheduled,
    RadiologyRequestExpired,
)


def schedule_radiology_request(request, pk):
    try:
        radiology_request = RadiologyRequest.objects.get(pk=pk)
    except RadiologyRequest.DoesNotExist:
        return HttpResponse("no radiology request", status=404)
    try:
        radiology_request.schedule(timezone.now())
    except RadiologyRequestAlreadyScheduled:
        return HttpResponse("already scheduled", status=409)
    except RadiologyRequestExpired:
        return HttpResponse("expired", status=409)
    radiology_request.save()
    return HttpResponse("scheduled")


def schedule_from_waitlist(pk):
    radiology_request = RadiologyRequest.objects.get(pk=pk)
    radiology_request.schedule(timezone.now())
    radiology_request.save()
```

`RadiologyRequest` is an active record: its class mirrors the radiology
request table, and `schedule` is its one action method. `schedule`
checks the status and the expiry and raises `RadiologyRequestExpired` or
`RadiologyRequestAlreadyScheduled` before it assigns either field, so a
refused call changes nothing (rule 1). Both paths call the same method:
the view reads neither the status nor the expiry, and
`schedule_from_waitlist`, a plain function that a view calls, uses no
`update()`, `bulk_update()` or `bulk_create()` (rule 2). The two paths
store a radiology request row under its primary key in the radiology
request table, each with one `save()`; neither opens a transaction of
its own, and each changes one row and hands nothing to another system,
which is the exception rule 3 states. Both entry paths call the model's
method; two requests that load the same radiology request at once both
pass it and both save. `select_for_update()` inside a transaction, left
out of this fence, makes the second wait on a store that provides row
locks and then load the scheduled row, which `schedule` refuses. The
state keeps rules 1 and 2: the rule sits in `schedule`, and neither path
writes the guarded field with `update()`, `bulk_update()` or
`bulk_create()`.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A rule in `clean()` or `ModelForm.clean()` that a `save()` path
  depends on.
- A view that reads a status or a date, decides, and then assigns the
  field it guards.
- `QuerySet.update()`, `bulk_update()` or `bulk_create()` on a field a
  rule guards.
- A `post_save` receiver that writes another model, sends a message or
  enqueues a job.
- A signal receiver that holds a rule rather than a notification.
- A view that saves several models with no `transaction.atomic()`.
- Work for another system sent before `transaction.on_commit()`.
- An app that imports another app's models, or a `ForeignKey` between
  two apps that keep separate models.
- A filter chain repeated in several views with no manager or
  `QuerySet` method naming the question.
- A custom manager that hands out a query builder instead of answering
  a named question.

## Common mistakes

- Moving a rule from a view into `clean()` and believing `save()` now
  runs it.
- Trusting `full_clean()` to run because a `ModelForm` validated the
  same object earlier.
- Using `update()` to skip a model method without noticing the rule
  that method holds.
- Calling `bulk_update()` for speed on a field a rule guards.
- Putting a second model's write in a `post_save` receiver so every
  save gets the effect, intended or not.
- Sending to another system inside the transaction and believing a
  rollback takes the message back.
- Treating a Django app as a boundary because its directory has its own
  name.
- Naming a query after a column instead of the question the clinic
  asks.
- Adding a custom manager method for a read of one row by its primary
  key.
- Keeping every rule on one large model because Django's ORM makes
  saving convenient.

## Related skills

- `oo-python` holds the language rules this skill applies, including
  its rules on protocols, frozen dataclasses and state kept behind its
  class.
- `oo-working-within-a-framework` decides what a framework may shape
  and what stays in the domain.
- `oo-encapsulating-state-and-behaviour` keeps state behind methods
  named for domain actions.
- `oo-designing-failure-behaviour` names a refusal and raises it before
  a change.
- `oo-designing-for-testability` passes a value such as the time into a
  domain method.
- `oo-placing-domain-logic` places a use case and its transaction.
- `oo-publishing-domain-events` says when work waits for a commit.
- `oo-organising-modules` gives a module a public interface.
- `oo-bounding-contexts` decides where one model ends and another
  begins.
- `oo-designing-aggregates` decides what one transaction changes.
- `oo-designing-repositories` declares a read in the domain's words.
- `oo-layering-the-system` keeps a read that decides nothing out of the
  domain.
- `oo-separating-presentation-from-domain` splits a screen's state from
  the domain.

## Further reading

- [Signals to direct calls](references/signals-to-direct-calls.md)
