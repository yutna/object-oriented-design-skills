---
name: oo-ruby-rails
description: Use when a Rails app's Active Record models gather rules, callbacks hide side effects, or a service or query object is being weighed.
license: MIT
metadata:
  version: 0.18.0
  pack: object-oriented-design-skills
---

# Designing Objects in Rails

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what Rails changes on top of `oo-ruby`: load that
skill too, because its rules on duck typing, modules and `Data` values
still hold in a Rails code base. Rails supplies Active Record,
whose instances stand for rows in a table, and callbacks that run inside the save;
the same rules now have new places to hide. A callback that writes a
second row, a controller that sets a guarded column with `update`, a
uniqueness validation with no index, and a model that gathers the
application's rules are the shapes this skill names. Rails 8.1 on Ruby
3.3 or later changes where these rules are kept, not what they require.

## When to use

- An Active Record model holds a rule over several rows, or a request
  that no single row holds.
- A callback writes another record, sends mail, enqueues a job, or
  raises after the save has started.
- A controller or a view changes a guarded column with `update`,
  `update_column`, `update_columns` or `update_all`.
- A uniqueness validation is the only guard on a column.
- A service object, a form object or a query object is being weighed
  against a model method.
- A model has grown rules that no longer match its table.

## When not to use

- The code is plain Ruby that uses no Rails class, which `oo-ruby`
  covers.
- The question is how a view or a front-end component splits its state
  from the domain: outside this skill, and
  `oo-separating-presentation-from-domain` covers the core rule.
- A question no Rails feature changes, such as which object owns a
  rule: the core skills, starting from `oo-design`.

## Core rules

1. Judgement. **Keep a model an active record while its class mirrors
   its table and holds few rules, and once its rules part from its
   table, move them into plain Ruby objects that the model delegates to
   or that a repository maps, as `oo-taming-persistence` rule 1 and
   `oo-working-within-a-framework` rule 3 ask.** An Active Record model
   wraps one row: Rails pluralizes the class name to find the table,
   infers the attributes from its columns, and lets an instance stand
   for one row. That shape works while the fields and rules stay
   close to that row. A rule that spans rows, or a request that no
   single row holds, sits in the class only by reaching across the
   table it mirrors, so it moves to a plain Ruby object: the model
   delegates to the object, or a repository maps between the row and
   the object. Rails still supplies the table, the connection and the
   migration; the rule no longer has to match a column.

2. Rule. **Let no callback hold a business rule or reach another record
   or another system: the use case calls those effects itself, and work
   for another system waits for the commit, through
   `transaction.after_commit` or a job enqueued after it, as
   `oo-working-within-a-framework` rule 1 and
   `oo-publishing-domain-events` rule 3 ask.** A callback runs when
   Rails changes an object: `after_create`, `after_save` and their kin
   run inside the save, and the save is wrapped in a transaction. A
   callback that writes a second record writes it on every path that
   saves the first, and a callback that sends a message can send it for
   a change that then rolls back. An exception in `after_save` rolls
   the transaction back, which shows the callback runs before the
   commit. The use case calls the second write and the outside work
   itself. When the work is for another system, it waits:
   `transaction.after_commit` runs after the transaction has committed.
   `after_commit` and `after_rollback` do not run until the database
   changes have been committed or rolled back, which is when a model's
   commit callbacks run. Neither callback is where the outside work
   goes; the use case's `transaction.after_commit` is.

3. Rule. **Change state that a rule guards only in a model method named
   for the action, which checks the rule and raises before anything
   changes; no controller sends `update(status: ...)`, no code assigns
   the guarded attribute outside that method, and no code uses
   `update_column`, `update_columns` or `update_all` on that state, as
   `oo-encapsulating-state-and-behaviour` rules 1 and 3,
   `oo-designing-repositories` rule 6 and
   `oo-designing-failure-behaviour` rule 4 ask.** `update_column`,
   `update_columns` and `update_all` skip validations and save
   regardless of validity, and the same three skip callbacks. `update`
   runs validations and callbacks. A controller that sends
   `update(status: ...)` decides the rule in the edge, and a second path
   with `update_column` writes the guarded column with no rule at all.
   The model method named for the action reads the current state, raises
   when the rule refuses, and only then writes, so every caller reaches
   the same check and nothing changes on a refused call. Active Record
   defines a public writer for every column of its table, `status=`
   beside `status`, so `oo-ruby` rule 3, which asks for readers only, is
   relaxed for those generated attribute writers. The writer is not a
   domain action: this rule forbids assigning the guarded attribute
   outside the action method. The bang save methods raise
   `ActiveRecord::RecordInvalid` on a failed validation; `save` and
   `update` return false, which a caller that ignores it never sees.

4. Default. **Put a use case that changes more than one model, or a
   request that maps onto no model, in a plain Ruby object: a service
   object that runs one transaction around one aggregate's change, or a
   form object built on `ActiveModel::Model`, as
   `oo-placing-domain-logic` rules 2 and 5, `oo-designing-aggregates`
   rule 4 and `oo-working-within-a-framework` rule 2 ask.** A
   controller that loads several models, checks their rules and saves
   them keeps the use case in the edge: a test needs a request to run
   it, and a second entry point cannot reach it. A service object is a
   plain Ruby object that takes its collaborators through its
   constructor, loads the aggregate, sends the commands and opens one
   transaction. A form object holds a request's attributes and
   validations with no table behind it; `ActiveModel::Model` includes
   `ActiveModel::API`, so it works with `form_with` and validations, and
   it is the shape for a model-like Ruby class with no table. The exception
   is a request that maps onto no model and changes nothing, such as a
   search that applies no business rule: it needs no service or form
   object, because a read query answers it and the read decides no rule
   (rule 5).

5. Default. **Name each read for the question it answers, in a scope or
   a query object, and keep `where` chains out of controllers and
   views, as `oo-designing-repositories` rules 3 and 4 and
   `oo-layering-the-system` rule 6 ask.** A scope reads as one clinic
   question at its call site, so `Appointment.for_clinician_on` says what
   comes back, while a `where` in a controller leaves the question
   spelled in the edge and each caller writes its own version of it. A
   query object carries criteria that combine freely. A scope always
   returns an `ActiveRecord::Relation`, even when its condition is
   false, while a class method with a conditional can return `nil`;
   that difference makes the scope the shape that still chains.
   The exception is a read of one row already named by an identity, such
   as a show action loading the record whose id the request carries: it
   needs no scope, because the caller already names the row.

6. Rule. **Hold a rule over many rows, such as one booked appointment
   per slot, with a database constraint, because a `uniqueness`
   validation alone does not hold when two saves run at once, as
   `oo-designing-aggregates` rule 6 and
   `oo-working-within-a-framework` rule 1 ask.** `validates :slot_id,
   uniqueness: true` finds no row with the value and creates no
   constraint in the database, so two connections can both find no row
   and both save. The validation creates no uniqueness constraint, so
   the unique index must be added, through `add_index` with
   `unique: true` in a migration. The database
   constraint refuses the second save whatever the application did
   first, so one model's method cannot keep the rule alone: the index
   sees every writer.

## Pattern

`Consent` records a patient's consent to a treatment. It is an Active
Record model with `status`, `given_at`, `withdrawn_at` and
`lock_version` columns, and its status a rule guards: only a pending
consent may be given, and only a given consent may be withdrawn. The
first fence is a controller that decides both rules and writes the
status itself, including one path with `update_column`. The second
fence moves each check into the model's action method and calls it from
a service object that opens one transaction.

Before:

```ruby
class ConsentsController < ApplicationController
  def update
    consent = Consent.find(params[:id])
    if consent.status == "pending"
      consent.update(status: "given")
      redirect_to consent
    else
      render :edit
    end
  end

  def withdraw
    consent = Consent.find(params[:id])
    consent.update_column(:status, "withdrawn")
    redirect_to consent
  end
end
```

In the Before, `update` reads `status`, decides whether the consent may
be given, and writes the guarded column with `update`, so the controller
owns the rule (rule 3). `withdraw` writes the same column with
`update_column`, which skips validations and callbacks, so no rule runs
on that path at all (rule 3). The fence stores a consent row under its
id in the consents table; the controller opens no transaction of its
own.

After:

```ruby
class ConsentAlreadyGiven < StandardError; end

class ConsentNotGiven < StandardError; end

class Consent < ApplicationRecord
  def give(at:)
    raise ConsentAlreadyGiven, "consent #{id} is not pending" unless
      status == "pending"

    update!(status: "given", given_at: at)
  rescue ActiveRecord::StaleObjectError
    raise ConsentAlreadyGiven, "consent #{id} is not pending"
  end

  def withdraw(at:)
    raise ConsentNotGiven, "consent #{id} was not given" unless
      status == "given"

    update!(status: "withdrawn", withdrawn_at: at)
  rescue ActiveRecord::StaleObjectError
    raise ConsentNotGiven, "consent #{id} was not given"
  end
end

class GiveConsent
  def call(consent_id:, at:)
    Consent.transaction do
      Consent.find(consent_id).give(at: at)
    end
  end
end

class WithdrawConsent
  def call(consent_id:, at:)
    Consent.transaction do
      Consent.find(consent_id).withdraw(at: at)
    end
  end
end
```

In the After, `Consent#give` and `Consent#withdraw` are named for the
actions; each checks the status and raises `ConsentAlreadyGiven` or
`ConsentNotGiven` before it writes, so nothing changes on a refused call
(rule 3). Two copies of the same consent, both loaded before either
saves, pass that check, because each read the status its action
expects; what refuses the second caller is the version guard.
The consents table holds an integer `lock_version` column, and Active
Record's optimistic locking reads it with the row and adds the version
it read to the save's condition. The first call writes the guarded
status, its timestamp and the next version; a second copy loaded before
that write matches no row, so its save raises
`ActiveRecord::StaleObjectError`, which `give` or `withdraw` turns into
its own refusal. That guard needs no row lock, so it refuses the second
caller on every store Rails supports. A caller sees
`ConsentAlreadyGiven`, `ConsentNotGiven` or, on a validation failure,
`ActiveRecord::RecordInvalid` (rule 3), and the guard's store error
never leaves the action. `GiveConsent` and `WithdrawConsent` are
plain Ruby service objects: each loads the consent, sends it one action
message, and opens one transaction around that one aggregate's change
(rule 4). The controller calls one of them. `update!` runs validations
inside the transaction, and the model's class still mirrors its table.
The fence shows the types in one file for reading. The fence stores a
consent row under its id in the consents table, inside the transaction
the service object opens: the guarded status, its timestamp and
`lock_version` change in that one save. The state keeps rules 3 and 4:
every change goes through the action method, and each service object
opens one transaction around one aggregate.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A callback that changes another record, sends mail, enqueues a job or
  calls an outside service.
- A model that knows a second model's rules or writes its rows.
- A controller or a view with a `where` chain, or a scope named after a
  column instead of a question.
- `update`, `update_column`, `update_columns` or `update_all` on a
  column a rule guards.
- A uniqueness validation with no unique index in the schema.
- A service object that changes several aggregates in one transaction.
- A form object whose `save` writes models with no transaction.
- A model whose rules no longer match the columns it mirrors.
- A callback that holds a business rule, whatever its timing.

## Common mistakes

- Adding a callback because several paths save the record, so every path
  gets the effect, intended or not.
- Trusting `validates :slot_id, uniqueness: true` to hold when two
  saves run at once.
- Calling `update_column` to skip callbacks without noticing the rules
  those callbacks held.
- Moving a controller action into a model and calling it a service
  object.
- Giving a form object a `save` that writes several models outside one
  transaction.
- Using a scope whose name states a rule, such as `available`, and
  letting a caller decide what the rule means.
- Treating `after_commit` as a place for a business rule.
- Keeping every rule on one large model because Active Record makes
  saving convenient.

## Related skills

- `oo-ruby` holds the language rules this skill applies, including its
  rules on duck typing, modules and `Data` values.
- `oo-taming-persistence` decides between an active record and a data
  mapper, and keeps a lazy load inside its transaction.
- `oo-working-within-a-framework` decides what a framework may shape
  and what stays in the domain.
- `oo-publishing-domain-events` says what an event is and when a
  reaction runs.
- `oo-placing-domain-logic` places a use case and its transaction.
- `oo-designing-aggregates` decides what one transaction changes.
- `oo-designing-repositories` declares a read and a repository in the
  domain's words.
- `oo-encapsulating-state-and-behaviour` keeps state behind methods
  named for actions.
- `oo-designing-failure-behaviour` names a refusal and raises it before
  a change.
- `oo-layering-the-system` keeps a read that decides nothing out of the
  domain.
- `oo-separating-presentation-from-domain` splits a screen's state from
  the domain.

## Further reading

- [Callbacks to use cases](references/callbacks-to-use-cases.md)
