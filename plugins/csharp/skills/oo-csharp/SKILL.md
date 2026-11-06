---
name: oo-csharp
description: Use when plain C# with no framework needs a record or a struct, nullable reference types, a default interface member, or async and await.
license: MIT
metadata:
  version: 0.17.0
  pack: object-oriented-design-skills
---

# Designing Objects in C\#

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

C# carries much of a design in its type system and leaves part of it
to the compiler alone: a record for a value, nullable reference types
for an answer that may be absent, a `readonly struct` for a small
value, and a default interface member for behaviour that
implementations share. This skill applies the pack's core rules to
plain C#, from version 12 on (.NET 8), with nullable reference types
enabled and no framework. It says which feature keeps each rule and
where the compiler helps: a record whose properties have no `init` or
`set` accessor, so `with` cannot change it past its constructor;
equality written over a list's contents; a checked `null` where code
outside the project calls in; and an application service that awaits
the ports while the domain stays synchronous.

## When to use

- A class holds several fields and two instances with the same
  contents stand for the same thing.
- A `with` expression copies a record, and a check written in its
  constructor or a property initializer is skipped.
- A record holds a list or another collection, and two records with
  equal contents compare unequal.
- A `struct` is used for a value, and its `default` is one a
  constructor would refuse.
- Nullable reference types are off, or `null` reaches a non-nullable
  parameter from outside the project.
- An interface has several implementations that share behaviour, and
  a default interface member is one choice.
- A domain object awaits a repository or another port inside its own
  method, or a constructor needs loaded data.
- A port method can refuse a call, and nothing in the code says which
  exception its implementations raise.

## When not to use

- A framework builds or wires the objects, such as a web framework
  that fills a request object or a data-access framework that maps a
  table: outside this skill.
- The code is Java, which `oo-java` covers.
- The question is one no C# feature changes, such as which object
  owns a rule or where a module boundary runs: the core skills,
  starting from `oo-design`.

## Core rules

1. Default. **Write a value as a record whose constructor checks its
   rules and whose properties have no `init` or `set` accessor, so a
   `with` expression cannot change one past that check; offer a method
   that answers a changed copy through the constructor, as
   `oo-modeling-values-and-entities` rule 2 and
   `oo-constructing-valid-objects` rules 1 and 3 ask.** A `with`
   expression copies the record through the compiler's copy
   constructor and then sets the `init` or `set` properties it names;
   the declared constructor and the property initializers do not run,
   so a check written in either is skipped. A property with no `init`
   or `set` accessor cannot be named by `with` at all: assigning it
   there fails to compile (CS0200). A method such as
   `WithChangeEveryDays` builds a new value through the checked
   constructor.

   The exception is a value whose printed form must not show a detail
   it carries, such as a patient's name: a record's generated
   `ToString` prints every public property and field, so write that
   value as a `sealed` class with private fields and only the accessors
   its callers need, with its own `Equals` and `GetHashCode`, keeping
   the same constructor checks.

2. Rule. **A value record that holds a collection defines its own
   `Equals` and `GetHashCode` over the collection's contents, as
   `oo-modeling-values-and-entities` rule 3 asks.** The generated
   equality compares each member with that member's own equality, and
   a `List<T>` compares by reference: two records whose lists hold
   equal items in two list objects are not equal, and their hash codes
   may differ. Write `Equals` over every property and each item in
   order, write `GetHashCode` from the same values in the same order,
   and copy the collection in the constructor so its contents cannot
   change after the value was built. A collection property typed as
   `IReadOnlyList<T>` and built with `Array.AsReadOnly` still needs
   this equality; the read-only view only stops a caller from changing
   it.

3. Rule. **Enable nullable reference types, mark with `?` only what
   the domain lets be absent, and still reject `null` with
   `ArgumentNullException.ThrowIfNull` where code outside the project
   calls in, because the annotations are not checked at run time, as
   `oo-designing-failure-behaviour` rule 5 and
   `oo-constructing-valid-objects` rule 3 ask.** A non-nullable
   reference can still hold `null` that reaches it from outside; the
   compiler gives warnings such as CS8600 and CS8618, not errors,
   unless the project treats warnings as errors. The `?` says the
   domain allows absence; it changes no run-time check, and `!` only
   silences the compiler. Check each value at the boundary and let the
   constructor or method throw a named error, so the rule is kept at
   run time too.

4. Default. **Declare a class or a record `sealed` unless it was
   built for extension, as `oo-honouring-substitutability` rule 5
   asks.** `sealed` refuses every subclass and tells a reader that no
   override is part of the design. Built for extension means the
   methods a subclass may override are named, each with the contract
   an override must keep written beside it, and which of the class's
   own methods send them; a record is open to inheritance until it is
   sealed, just like a class, and a `sealed` record still receives its
   generated equality, its copy constructor and its `with` expression.

   The exception is a framework that must extend the class at run
   time, such as a proxy for lazy loading: leave it open and say in
   the code why. A class built for extension is still declared
   `abstract` when it has no complete implementation, and each method
   a subclass may override is `virtual` or `abstract`.

5. Rule. **Declare a `struct` only for a small value whose all-zero
   `default` is a valid value, and make it `readonly`, as
   `oo-modeling-values-and-entities` rule 2,
   `oo-constructing-valid-objects` rule 1, and
   `oo-making-illegal-states-impossible` rule 1 ask.** `default` and
   a new array of a struct type produce the all-zero value and ignore
   every constructor, the parameterless one included, so a struct
   whose constructor refuses zero has a value that never passed it. A
   `readonly struct` or `readonly record struct` cannot change after
   construction and copies by value; use a class or a record when the
   all-zero value is not one the clinic allows.

6. Judgement. **Choose a default interface member, an abstract class
   or a new interface: a default interface member when the shared
   behaviour can be written from the interface's other members and
   needs no state; an abstract class when the shared code needs
   instance fields or a fixed order of steps; a new interface when a
   caller needs a narrower role, as `oo-designing-interfaces` rule 4
   and `oo-crossing-system-boundaries` rule 4 ask.** A default
   interface member is reachable only through the interface type, not
   through a reference typed as the implementing class (CS1061), and
   an interface declares no instance fields. Adding a default member
   to a published interface leaves existing class implementers
   working, which is the compatible change
   `oo-crossing-system-boundaries` rule 4 asks of a published
   contract; adding an abstract member breaks them. What tips the
   balance is whether the shared code needs state, which an interface
   cannot hold.

7. Rule. **Keep `async` in the shell: a domain object's methods are
   synchronous and reach no port, no constructor waits for anything,
   and the application service awaits the ports and then builds and
   calls the domain objects with what it loaded, as
   `oo-applying-functional-techniques` rule 3,
   `oo-designing-for-testability` rule 4, and
   `oo-placing-domain-logic` rule 2 ask.** A constructor cannot be
   `async`, so it sets fields and checks them; loading a patient or a
   claim waits in the application service, which passes the loaded
   values on. A domain method that awaits a port ties the domain to
   an outside system, and every test of the domain must stand that
   system in. The application service is the shell: it awaits the port
   once, then sends the synchronous domain method its values.

8. Rule. **Declare each refusal a port's method raises in an
   `<exception cref="...">` documentation tag on the port, because C#
   checks no exception declaration, and let the adapter turn a
   library's exception into one of them, as
   `oo-designing-failure-behaviour` rules 1 and 7 ask.** C# has no
   checked exception, so the compiler never makes a caller handle a
   refusal; the XML tag is where the caller reads which refusal to
   expect. The port declares every exception its implementations
   raise, and an implementation raises nothing its port does not
   declare. The adapter catches the provider's own exception, such as
   a gateway's failure, and throws one of the port's refusals or lets
   it pass as a fault.

## Pattern

`WoundCarePlan` is the plan the clinic gives a patient for care of a
wound at home: a summary, the days between dressing changes, and the
steps to follow. Two plans with the same contents are the same plan, a
value (`oo-modeling-values-and-entities` rule 1).

Before:

```csharp
using System;
using System.Collections.Generic;

public record WoundCarePlan(
    string Summary,
    int ChangeEveryDays,
    List<string> Steps)
{
    public int ChangeEveryDays { get; init; } =
        ChangeEveryDays > 0
            ? ChangeEveryDays
            : throw new ArgumentOutOfRangeException(
                nameof(ChangeEveryDays),
                "a plan changes the dressing at least every day");
}
```

In the Before, `ChangeEveryDays` is a positional property with an
`init` accessor, so `plan with { ChangeEveryDays = 0 }` compiles; the
check sits in the property initializer, which `with` does not run, so
the copy holds a plan construction would refuse (rule 1). The
`List<string>` property is compared by the generated equality with the
list's own equality, which is reference equality, so two plans holding
equal steps in two lists are not equal (rule 2). The caller's list is
kept, so a change to it changes the plan's contents (rule 2). The
fence stores nothing.

After:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public sealed record WoundCarePlan
{
    public string Summary { get; }
    public int ChangeEveryDays { get; }
    public IReadOnlyList<string> Steps { get; }

    public WoundCarePlan(
        string summary, int changeEveryDays, IEnumerable<string> steps)
    {
        if (string.IsNullOrWhiteSpace(summary))
        {
            throw new ArgumentException(
                "a plan names its summary", nameof(summary));
        }
        if (changeEveryDays < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(changeEveryDays),
                "a plan changes the dressing at least every day");
        }
        ArgumentNullException.ThrowIfNull(steps);
        Summary = summary;
        ChangeEveryDays = changeEveryDays;
        Steps = Array.AsReadOnly(steps.ToArray());
    }

    public WoundCarePlan WithChangeEveryDays(int changeEveryDays)
    {
        return new WoundCarePlan(Summary, changeEveryDays, Steps);
    }

    public bool Equals(WoundCarePlan? other)
    {
        return other is not null &&
            Summary == other.Summary &&
            ChangeEveryDays == other.ChangeEveryDays &&
            Steps.SequenceEqual(other.Steps);
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(Summary);
        hash.Add(ChangeEveryDays);
        foreach (var step in Steps)
        {
            hash.Add(step);
        }
        return hash.ToHashCode();
    }
}
```

In the After, every property is get-only, so no `with` expression can
name one: assigning a get-only property in `with` fails to compile
(CS0200). The constructor checks the summary and the days, copies the
steps into a read-only view, and `WithChangeEveryDays` answers a new
plan through that constructor (rule 1). `Equals` compares the summary,
the days and each step in order, and `GetHashCode` hashes the same
contents in the same order, so two plans with equal steps in two
different lists are equal and hash alike (rule 2). `Array.AsReadOnly`
wraps the copied array, so a caller's later change to the original
list cannot reach the plan. Every property is set before a method
reads it. The fence stores nothing.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A `with` expression that names a property whose check sits in a
  constructor or a property initializer.
- A record that holds a list or another collection and has no
  `Equals` over its contents.
- A struct whose `default` a constructor would refuse.
- A `null` accepted from outside the project without a named error.
- A `!` that silences a warning at a boundary rather than a check
  that handles the value.
- A domain object with an `async` method that awaits a port.
- A constructor that awaits or starts work.
- A port method that can raise a refusal no `<exception>` tag names.
- A class or a record open to extension with no contract for an
  override.

## Common mistakes

- Putting a value's check in a property initializer and then using
  `with`.
- Trusting a record's generated equality for a list member.
- Using `default` as a safe struct value.
- Believing `string?` and `string` differ at run time.
- Marking a value `readonly` but leaving a mutable collection it
  holds.
- Adding a default interface member where the shared code needs a
  field.
- Making a domain method `async` so it can await a repository.
- Leaving a caller to learn a port's refusal from an implementation
  rather than its documentation tag.

## Related skills

- `oo-design` sizes a task and defines the rule labels.
- `oo-modeling-values-and-entities` decides whether a concept is a
  value or an entity, and what equality reads.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-designing-failure-behaviour` tells a refusal from a fault and
  chooses how absence is answered.
- `oo-honouring-substitutability` decides whether a class may be
  extended and what an override keeps.
- `oo-making-illegal-states-impossible` makes every value a state the
  domain allows.
- `oo-designing-interfaces` shapes a role around its caller.
- `oo-crossing-system-boundaries` keeps a published contract
  compatible with its readers.
- `oo-applying-functional-techniques` separates a use case's decision
  from its effects.
- `oo-designing-for-testability` keeps work out of a constructor.
- `oo-placing-domain-logic` keeps an application service to
  coordination.
- `oo-java` applies the same rules where a checked exception is the
  compiler's concern.

## Further reading

- [Async at the edge](references/async-at-the-edge.md)
