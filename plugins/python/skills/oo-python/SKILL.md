---
name: oo-python
description: Use when plain Python with no framework needs a Protocol or an ABC, a frozen dataclass, a mixin and its MRO, or a property instead of a setter.
license: MIT
metadata:
  version: 0.16.1
  pack: object-oriented-design-skills
---

# Designing Objects in Python

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

Python leaves much of a design to convention: a role has no declaration
unless a `Protocol` names it, a value stays changeable unless a
dataclass is frozen and holds no list, and state that a rule guards is
only as private as its leading underscore suggests. This skill applies
the pack's core rules to plain Python, from version 3.12 on, with no
framework and a type checker such as mypy. It says which feature keeps
each rule and where the runtime stops helping: a frozen dataclass that
still holds a mutable list, an `isinstance` check that reads only
method names, and a `@final` mark that only the checker enforces.

## When to use

- Two or more classes play one role, and nothing in the code declares
  which messages the role requires.
- A value is written as a plain dataclass, and any caller can change it
  or the list it holds.
- A frozen dataclass holds a list or another mutable field.
- A rule on an attribute can be broken from outside the class.
- A mixin reads its host's attributes, or `super()` reaches a class the
  method's own class never names.
- Code asks `isinstance` or `type()` before sending an object a
  message.

## When not to use

- A framework builds or wires the objects, such as a web framework with
  its own models: outside this skill.
- The code is JavaScript, which `oo-javascript` covers.
- The question is one no Python feature changes, such as which object
  owns a rule or where a module boundary runs: the core skills,
  starting from `oo-design`.

## Core rules

1. Default. **Name each role a caller needs as a `typing.Protocol`,
   annotate every parameter that takes the role with it, and leave the
   implementation unnamed, so a type checker reports a class that does
   not match, as `oo-designing-interfaces` rule 5 asks.** Python
   matches an object by the methods it happens to have, and no runtime
   check makes a class declare the protocol, so a class with a wrong
   method signature can be passed where the role is expected; the
   annotation is what a checker such as mypy reads, and a class that
   fails it is reported. The protocol is also where the contract sits
   that every implementation keeps, as
   `oo-honouring-substitutability` rule 4 asks.

   The exception is a role whose whole contract is one call, such as a
   callback: annotate the parameter with a `Callable` type, because the
   call is the only message the caller sends and a Protocol would add a
   class for a function.

2. Judgement. **Choose a `Protocol` when the implementations share only
   a promise, and an abstract base class when they share state or a
   fixed order of steps the base class owns, as
   `oo-designing-interfaces` rule 4 chooses an interface or a base
   class.** A protocol is never instantiated, so it holds no state and
   fixes no order; an ABC carries its fields, its constructor and the
   concrete methods its subclasses inherit, and a subclass that leaves
   an `@abstractmethod` unoverridden raises `TypeError` when it is
   instantiated. What tips the balance is whether the shared code needs
   state: prefer the protocol unless the code would otherwise be
   repeated.

3. Default. **Write a value as a frozen dataclass whose `__post_init__`
   checks its rules and whose fields hold immutable types, such as a
   tuple in place of a list, and answer a changed copy with
   `dataclasses.replace`, which builds the copy through `__init__` and
   runs the same checks, as `oo-modeling-values-and-entities` rules 2
   and 3 and `oo-constructing-valid-objects` rule 3 ask.** A frozen
   dataclass refuses an assignment to a field with
   `FrozenInstanceError`, and when it compares by value it derives
   `__hash__` from the same fields, so two equal copies hash alike; the
   freeze is shallow, though, so a list held in a field still changes,
   and hashing that value raises `TypeError`. Hold a tuple or another
   immutable value, and let `replace` build every changed copy, because
   it calls the class's `__init__` and `__post_init__`, and a check
   outside those runs for no copy.

   The exception is state that must change while a caller holds it,
   such as the observations a clinician adds during a visit: that is an
   entity whose method owns the rule, because a frozen dataclass stops
   a field being rebound and leaves the list it holds changeable.

4. Rule. **Keep state that a rule guards in attributes whose names
   start with an underscore, read it through a `property` with no
   setter, and change it only through a method named for the domain
   action, never through a setter or a descriptor's `__set__`, which
   run on a plain assignment, as
   `oo-encapsulating-state-and-behaviour` rules 1 and 2 ask.** A
   leading underscore marks a name internal by convention only, so a
   caller can still assign it; a property with no setter makes the
   assignment raise `AttributeError`, and a data descriptor's `__set__`
   runs whenever `holder.attribute = value` runs. A method such as
   `reschedule` reads the current state, checks the rule, and changes
   only what the action allows.

5. Default. **Share behaviour across classes with an object each one
   holds, not a mixin, as `oo-choosing-composition-over-inheritance`
   rule 5 asks; a mixin that stays holds no state, uses only the host's
   public methods, so it depends on no send the host keeps internal, as
   rule 3 there asks, and calls `super()` knowing that it reaches the
   next class in the instance's method resolution order.** A held object
   has its own attributes and offers only the messages its holder
   sends. A mixin shares the host's attributes and can break a rule the
   host keeps; it also makes `super()` reach a class the mixin never
   names, because in `class C(A, B)` a `super().save()` written in `A`
   calls `B.save`, and the route comes from the instance's MRO.

   The exception is a mixin that adds only behaviour built from the
   host's public methods, such as an ordering built from a comparison
   the host defines: it holds no state and touches no field, so it
   cannot break the host's rules.

6. Rule. **Never ask which class an object is, with `isinstance` or
   `type()`, before sending it a message, as
   `oo-honouring-substitutability` rule 6 asks.** Such a check puts the
   class into the caller: a new implementation must be added to the
   check or it takes the other branch, and the caller depends on the
   class rather than on the role's messages. When one implementation
   needs a different message, the role's contract is wrong or that
   implementation does not keep it, and rule 6 there says to fix the
   subtype or the hierarchy, not the caller. A protocol is what lets a
   checker report a message the declared role does not have (rule 1).

7. Default. **Mark a class `@final` unless it was built for extension,
   knowing that only a type checker enforces it, as
   `oo-honouring-substitutability` rule 5 asks.** `typing.final` tells
   a reader and mypy that no subclass is part of the design; at run
   time a subclass of a `final` class is created without error, so the
   mark records the intent and the checker guards it. Built for
   extension means the methods a subclass may override are named, each
   with the contract an override must keep written beside it, and which
   of the class's own methods send them.

   The exception is a framework that must extend the class at run time,
   such as a proxy for lazy loading: leave the class open and say in
   the code why.

## Pattern

`ReferralLetter` is a letter the clinic sends to another clinician
about a patient's care: its reason and the names of the files that go
with it. Two letters with the same reason and attachments are the same
letter, a value (`oo-modeling-values-and-entities` rule 1).

Before:

```python
from dataclasses import dataclass


@dataclass
class ReferralLetter:
    reason: str
    attachments: list[str]

    def with_reason(self, reason: str) -> "ReferralLetter":
        return ReferralLetter(reason, self.attachments)


attachments = ["scan.pdf"]
letter = ReferralLetter("review the scan", attachments)
attachments.append("")
letter.reason = ""
```

In the Before, `ReferralLetter` is a plain dataclass, so any caller can
assign `letter.reason` or append to the list it holds (rule 3). The
constructor keeps the caller's list, so the later append changes the
letter's attachments as well (rule 3). Nothing refuses a blank reason
or a blank attachment (rule 3), and `with_reason` builds a new letter
that shares the original list (rule 3). The fence stores nothing: it
leaves out where a letter is saved, under which identity, and in which
transaction.

After:

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class ReferralLetter:
    reason: str
    attachments: tuple[str, ...]

    def __post_init__(self) -> None:
        if self.reason.strip() == "":
            raise ValueError("a referral letter names its reason")
        if len(self.attachments) == 0:
            raise ValueError("a referral letter carries an attachment")
        for attachment in self.attachments:
            if attachment.strip() == "":
                raise ValueError("an attachment is named")

    def with_reason(self, reason: str) -> "ReferralLetter":
        return replace(self, reason=reason)
```

In the After, `ReferralLetter` is a frozen dataclass: assigning
`reason` or `attachments` raises `FrozenInstanceError` (rule 3).
`attachments` is a tuple, so no caller can append to it (rule 3).
`__post_init__` runs during construction and refuses a blank reason, no
attachments, or a blank attachment (rule 3). `with_reason` calls
`replace`, which builds the copy through `__init__` and `__post_init__`,
so the checks hold for the copy too (rule 3). The generated equality
reads both fields and the generated hash reads the same fields, so two
letters with equal contents hash alike (rule 3). The fence stores
nothing: it leaves out where a letter is saved, under which identity,
and in which transaction.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A role played by two or more classes with no `Protocol` naming it.
- A plain dataclass whose value any caller can assign.
- A frozen dataclass that holds a list or another mutable field.
- A rule kept only by a leading underscore.
- A property with a setter, or a descriptor's `__set__`, that holds a
  clinic rule.
- A mixin that reads or writes its host's attributes.
- A `super()` call in a mixin with no note on the instance's MRO.
- `isinstance` or `type()` compared before a message is sent.
- A class that is neither `@final` nor written for extension.

## Common mistakes

- Believing the annotation of a `Protocol` checks anything at run time.
- Using `isinstance` against a `Protocol` without
  `@runtime_checkable`, so it raises `TypeError`.
- Believing a `@runtime_checkable` protocol compares method
  signatures.
- Freezing a dataclass and believing the list it holds is frozen too.
- Hashing a frozen dataclass whose field holds a list.
- Leaving a value's check in a factory, so `replace` skips it.
- Treating a leading underscore as privacy.
- Adding a setter to quiet a caller that assigns a field.
- Calling `super()` in a mixin without reading the instance's MRO.
- Writing `@final` and expecting a runtime error on subclassing.

## Related skills

- `oo-design` sizes a task and defines the rule labels.
- `oo-designing-interfaces` shapes a role around its caller.
- `oo-honouring-substitutability` says what every implementation of a
  role must keep.
- `oo-modeling-values-and-entities` decides whether a concept is a
  value or an entity, and what equality reads.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-encapsulating-state-and-behaviour` keeps an invariant with the
  state it guards.
- `oo-choosing-composition-over-inheritance` decides when to hold an
  object instead of extending a class.
- `oo-javascript` shows how the same rules read in a language with no
  type checker.

## Further reading

- [Roles and mixins](references/roles-and-mixins.md)
