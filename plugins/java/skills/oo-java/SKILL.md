---
name: oo-java
description: Use when plain Java code with no framework needs a record or a sealed type, equals and hashCode, a checked exception, or a choice to make a class final.
license: MIT
metadata:
  version: 0.15.0
  pack: object-oriented-design-skills
---

# Designing Objects in Java

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

Java carries much of a design in its type system: a record for a value,
a sealed interface for a set the clinic closes, a checked exception for
a refusal, and `Optional` for an answer that may be absent. This skill
applies the pack's core rules to plain Java, from version 21 on, with no
framework. It says which feature keeps each rule and how the compiler
then helps: an equal value that stays equal while it sits in a set, a
`switch` that a new case cannot leave half-answered, and a caller that
cannot ignore a refusal by accident.

## When to use

- A class holds several fields and two instances with the same contents
  stand for the same thing.
- A set of cases is closed, and code answers it with `if` chains or a
  `switch` that has a `default` branch.
- A method on a port can fail in a way its caller can act on.
- A query can have no answer, and the code answers `null` today.
- A class is public and has no subclass, and someone asks whether it may
  be extended.
- Several implementations of one interface share a piece of behaviour.

## When not to use

- The classes are built, wired or extended by a framework, such as one
  that fills objects from annotations: outside this skill.
- The question is one no Java feature changes, such as which object owns
  a rule or where a module's boundary runs. The core skills answer it,
  starting from `oo-design`.
- The source files are not `.java` but another language that runs on the
  same virtual machine: outside this skill.

## Core rules

1. Default. **Write a value as a record, check its rules in the compact
   canonical constructor, and copy each collection component there with
   `List.copyOf`, `Set.copyOf` or `Map.copyOf`.** A record's components
   are final fields, and the `equals` and `hashCode` it derives read all
   of them, so a record is a value as
   `oo-modeling-values-and-entities` rules 2 and 3 ask, once its
   arguments are checked, as `oo-constructing-valid-objects` rule 3
   asks, and its collections are copied, as
   `oo-encapsulating-state-and-behaviour` rule 6 asks.

   The exception is a value whose representation must stay hidden,
   because each component of a record has a public accessor: write it as
   a `final` class with private final fields, and give it `equals` and
   `hashCode` as rule 2 asks.

2. Rule. **In a class that compares by value, override `equals` and
   `hashCode` together, from the same fields, and keep `compareTo`
   consistent with `equals`, as `oo-modeling-values-and-entities` rule 3
   asks.** A field that `equals` reads never changes while its object
   sits in a `HashSet` or keys a `HashMap`, because a set's behaviour is
   not specified once an element changes in a way that affects `equals`:
   a value has no such field, as `oo-modeling-values-and-entities` rule
   2 says, and an entity compares by its identifier alone, as rule 4
   there says.

3. Default. **Close a set of cases the domain closes with a `sealed`
   interface whose permitted classes are records, and answer each case in
   a `switch` expression that names every permitted class and has no
   `default` branch, as `oo-making-illegal-states-impossible` rule 2 and
   `oo-patterns-the-language-provides` rule 5 ask: the compiler then
   rejects a `switch` that a new case leaves out.** The exception is a
   set to which new kinds arrive more often than new operations: give
   each kind its behaviour as a method of the interface, as
   `oo-replacing-conditionals-with-polymorphism` rule 7 weighs it.

4. Rule. **Declare on each method of a port, in its `throws` clause,
   every checked exception its implementations throw, and let the adapter
   catch a library's checked exception, such as `IOException`, and throw
   the port's refusal or an unchecked fault in its place, as
   `oo-designing-failure-behaviour` rule 7 asks.** The compiler then
   rejects an implementation that throws a checked exception its port
   does not declare.

5. Default. **Make a refusal a checked exception and a fault an unchecked
   one, once `oo-designing-failure-behaviour` rule 2 has told them
   apart.** The compiler then makes each caller handle or declare a
   refusal, which is how that rule asks a refusal to be declared, and
   lets a fault pass up, undeclared, to the one handler at the edge; when
   a module raises more than one refusal, they share a checked base
   exception, as `oo-designing-failure-behaviour` rule 3 asks.

   The exception is a refusal raised inside a function value that a
   library method runs, such as the function given to a stream's `map`:
   the library's functional interfaces declare no checked exception, so
   loop over the items yourself where a refusal can be raised.

6. Rule. **Answer a value that may be absent as an `Optional`, never as
   `null`, as `oo-designing-failure-behaviour` rule 5 asks, and keep
   `Optional` to return types, the use its documentation names.** Where
   absence is an error, throw instead.

7. Default. **Declare a class `final`, or `sealed` with the classes it
   permits, unless it was built for extension, as
   `oo-honouring-substitutability` rule 5 asks; a record is final
   already.** The exception is a class built for extension: declare it
   `abstract`, mark `final` each method a subclass must not override, and
   write beside each method a subclass may override the contract the
   override keeps.

8. Judgement. **Choose a `default` method or an abstract class for
   behaviour that implementations share, as `oo-designing-interfaces`
   rule 4 chooses an interface or a base class: a `default` method when
   it can be written from the interface's own abstract methods alone, an
   abstract class when it needs fields or fixes the order in which its
   own methods run.** What tips the balance is whether the shared code
   needs state, which an interface cannot hold.

## Pattern

`DosageInstruction` is how often a patient takes one medication and the
warnings that go with it, and two instructions with the same contents
are the same instruction, a value
(`oo-modeling-values-and-entities` rule 1).

Before:

```java
import java.util.List;

public class DosageInstruction {
    private String medication;
    private int timesPerDay;
    private List<String> warnings;

    public DosageInstruction(
            String medication, int timesPerDay, List<String> warnings) {
        this.medication = medication;
        this.timesPerDay = timesPerDay;
        this.warnings = warnings;
    }

    public void setTimesPerDay(int timesPerDay) {
        this.timesPerDay = timesPerDay;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof DosageInstruction that
                && medication.equals(that.medication)
                && timesPerDay == that.timesPerDay;
    }
}
```

In the Before, `setTimesPerDay` changes a field that `equals` reads, so
an instruction changed while it sits in a `HashSet` leaves the set's
behaviour unspecified (rule 2), and `equals` is overridden without
`hashCode`, so two equal instructions can hash apart (rule 2). `equals`
ignores `warnings`, part of the instruction's contents
(`oo-modeling-values-and-entities` rule 3). The caller's list is kept
and handed out by `getWarnings`, so either holder can change it (rule 1,
`oo-encapsulating-state-and-behaviour` rule 6). Nothing refuses a blank
medication or no dose a day (rule 1).

After:

```java
import java.util.List;

public record DosageInstruction(
        String medication, int timesPerDay, List<String> warnings) {

    public DosageInstruction {
        if (medication.isBlank()) {
            throw new IllegalArgumentException("no medication is named");
        }
        if (timesPerDay < 1) {
            throw new IllegalArgumentException("fewer than one dose a day");
        }
        warnings = List.copyOf(warnings);
    }

    public DosageInstruction withTimesPerDay(int newTimesPerDay) {
        return new DosageInstruction(medication, newTimesPerDay, warnings);
    }
}
```

In the After, the record's `equals` and `hashCode` are derived from all
three components (rules 1 and 2). The compact constructor refuses a
blank medication and fewer than one dose a day, and it copies `warnings`
with `List.copyOf`, which answers an unmodifiable list (rule 1).
`withTimesPerDay` answers a new instruction instead of changing this
one (rule 1). `isBlank` answers whether a string is empty or holds only
white space. Every field is set by the constructor before a method
reads it. The fences store nothing.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A class that overrides `equals` without `hashCode`.
- A setter on a class whose instances sit in a `HashSet` or key a
  `HashMap`.
- A `switch` over a sealed interface that has a `default` branch.
- A method that answers `null` for "not found".
- A port method that declares a library's checked exception, such as
  `IOException`.
- `Optional` as the type of a field or a parameter.
- A public class that is neither `final` nor says what a subclass may
  override.

## Common mistakes

- Writing an entity as a record, so two patients with the same details
  compare equal.
- Keeping a caller's list in a record without copying it.
- Making a fault a checked exception, so every caller must declare it.
- Wrapping each refusal in an unchecked exception so the compiler stops
  asking.
- Adding a `default` branch to a `switch` to quiet the compiler.
- Answering `Optional` from a method that can also answer `null`.

## Related skills

- `oo-design` sizes a task and defines the rule labels.
- `oo-modeling-values-and-entities` decides whether a concept is a value
  or an entity, and what equality compares.
- `oo-making-illegal-states-impossible` closes a set of states where the
  domain closes it.
- `oo-designing-failure-behaviour` tells a refusal from a fault and
  chooses how absence is answered.
- `oo-honouring-substitutability` decides whether a class may be
  extended and what an override keeps.
- `oo-designing-interfaces` chooses an interface or a base class for
  shared behaviour.
- `oo-patterns-the-language-provides` shows when a language feature
  replaces a pattern.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-encapsulating-state-and-behaviour` keeps a collection private and
  copies it at the boundary.

## Further reading

- [Closed sets and refusals](references/closed-sets-and-refusals.md)
