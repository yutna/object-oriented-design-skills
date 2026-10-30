---
name: oo-kotlin
description: Use when plain Kotlin code with no framework needs a data class or a sealed type, a choice of nullable types, delegation with by, or extension functions.
license: MIT
metadata:
  version: 0.16.0
  pack: object-oriented-design-skills
---

# Designing Objects in Kotlin

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

Kotlin puts much of a design into the type system: a `data class` for a
value, a `@JvmInline` `value class` for one property that carries a
rule, a `sealed interface` for a set the clinic closes, and a nullable
type for an answer that may be absent. This skill applies the pack's
core rules to plain Kotlin, from Kotlin 2.0 on, on the JVM, with no
framework. It says which feature keeps each rule and how the compiler
then helps: an `init` block that a `copy()` cannot skip, a `when` that a
new case cannot leave half-answered, and a value that cannot be read as
present unless the compiler has seen the check.

## When to use

- A data class holds several fields, and two instances with the same
  contents stand for the same thing.
- A data class's checks sit in a factory or a secondary constructor, and
  a caller can reach the primary constructor.
- A set of cases is closed, and code answers it with a `when` that has
  an `else` branch.
- A property or a return type may be absent, and the code asserts a
  value with `!!`.
- Several implementations of one interface share behaviour, or a class
  extends an `open` class only to reuse its code.
- A helper function on a class's type starts to hold a rule that
  belongs to the class.

## When not to use

- The classes are built or wired by a framework, such as one for a
  phone's screens or for a server: outside this skill.
- The question is one no Kotlin feature changes, such as which object
  owns a rule or where a module's boundary runs: the core skills,
  starting from `oo-design`.
- The code shares one source between several platforms: outside this
  skill.

## Core rules

1. Rule. **Check a data class's rules in an `init` block with `require`,
   never only in a factory or a secondary constructor.** Every `copy()`
   reaches the primary constructor, so the `init` block checks each
   copy, while a check kept in a factory runs for no copy at all;
   `require` throws an `IllegalArgumentException` that names the rule
   the value broke, as `oo-constructing-valid-objects` rules 1 and 3
   ask.

2. Default. **Write a value as a `data class` whose properties are all
   `val` and all declared in the primary constructor, so its `equals`,
   `hashCode` and `copy` are derived from all of its contents, as
   `oo-modeling-values-and-entities` rules 2 and 3 ask; a property
   declared in the class body is left out of them.** The exception is a
   value that holds a single property, such as a patient's identifier:
   write it as a `@JvmInline` `value class`, a type of its own around
   that one property, as `oo-modeling-values-and-entities` rule 5 asks.

3. Default. **Close a set of cases the domain closes with a `sealed
   interface` whose cases are data classes and data objects, and answer
   each case in a `when` expression that names every case and has no
   `else` branch, as `oo-making-illegal-states-impossible` rule 2 and
   `oo-patterns-the-language-provides` rule 5 ask: the compiler checks
   that every case is covered.** The exception is a set that gains new
   kinds more often than new operations: give each kind its behaviour as
   a member of the interface, as
   `oo-replacing-conditionals-with-polymorphism` rule 7 weighs it.

4. Rule. **Declare a property or a return type nullable only where the
   domain lets the value be absent, and never assert a value present
   with `!!` on a path the clinic's rules run.** A value that every
   state carries is not nullable, as
   `oo-making-illegal-states-impossible` rule 6 asks. Handle an absent
   value where it is read, with `?.`, `?:` or a check the compiler
   sees, as `oo-designing-failure-behaviour` rule 5 asks; where absence
   is an error, `?: throw` raises the refusal it is.

5. Default. **Reuse an interface's behaviour by class delegation, with
   `by`, rather than by extending a class, as
   `oo-choosing-composition-over-inheritance` rule 1 asks: the compiler
   writes the forwarding methods, and the class overrides only what it
   changes.** A method the delegate runs itself never reaches the
   delegating class's overrides, and the class gives `by` only an
   interface whose every message it means to offer, as
   `oo-choosing-composition-over-inheritance` rule 6 asks. The exception
   is a sealed hierarchy: its subtypes are the hierarchy's cases, not
   reuses of a parent's code (rule 3).

6. Judgement. **Write an extension function only for what needs the
   receiver's public members alone and holds none of the receiver's
   rules, such as formatting a visit for one screen.** A class's rule
   belongs in the class, where `oo-encapsulating-state-and-behaviour`
   rule 1 keeps an invariant with the state it guards and
   `oo-assigning-responsibilities` rule 1 gives a behaviour to the
   object that holds its information. The compiler resolves an
   extension statically, from the declared type, so a subtype's function
   cannot override it, and the extension cannot read the receiver's
   private members. What tips the balance is whose words the function
   speaks: the receiver's own words make it a member, while one
   caller's words keep it an extension beside that caller.

## Pattern

`ExercisePlan` is the exercise a physiotherapist sets a patient to
repeat at home between visits, with its repetitions and its sets a day.
Two plans with the same contents are the same plan, which makes it a
value (`oo-modeling-values-and-entities` rule 1).

Before:

```kotlin
data class ExercisePlan(
    val exercise: String,
    val repetitions: Int,
    val setsPerDay: Int,
) {
    companion object {
        fun of(
            exercise: String,
            repetitions: Int,
            setsPerDay: Int,
        ): ExercisePlan {
            require(exercise.isNotBlank()) { "the plan names its exercise" }
            require(repetitions > 0) { "at least one repetition" }
            require(setsPerDay > 0) { "at least one set a day" }
            return ExercisePlan(exercise, repetitions, setsPerDay)
        }
    }
}
```

In the Before, the checks sit in the factory `of`, so the public
primary constructor and every `copy()` build a plan the clinic forbids;
`copy(setsPerDay = 0)` is one such plan (rule 1).

After:

```kotlin
data class ExercisePlan(
    val exercise: String,
    val repetitions: Int,
    val setsPerDay: Int,
) {
    init {
        require(exercise.isNotBlank()) { "the plan names its exercise" }
        require(repetitions > 0) { "at least one repetition" }
        require(setsPerDay > 0) { "at least one set a day" }
    }
}
```

In the After, the `init` block runs for every construction, `copy()`
included, so no such plan can exist (rule 1), and all three properties
are `val`s in the primary constructor, so `equals`, `hashCode` and
`copy` read all of them (rule 2). `require` throws an
`IllegalArgumentException` with the message its block gives, and
`isNotBlank` answers whether a string holds a character other than
white space. The fences store nothing. The `init` block reads only
properties the primary constructor set.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A `!!` on a property the domain always has, such as an appointment's
  clinician.
- A data class whose checks sit only in a factory or a secondary
  constructor, with none in `init`.
- A `var` property in a data class.
- A `when` over a sealed type with an `else` branch.
- An extension function that holds a rule of the receiver.
- A class that extends an `open` class only to reuse its code.

## Common mistakes

- Making a property nullable because a later step fills it in.
- Putting a data class's checks in a factory, so `copy()` skips them.
- Declaring part of a value's contents in the class body, where
  `equals` does not read it.
- Adding an `else` branch to a `when` to quiet the compiler.
- Turning helpers into extension functions until a class's rules are
  spread over several files.
- Marking classes `open` by habit.

## Related skills

- `oo-design` sizes a task and defines the rule labels.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-modeling-values-and-entities` decides whether a concept is a
  value or an entity, and what equality reads.
- `oo-making-illegal-states-impossible` closes a set of states where
  the domain closes it.
- `oo-designing-failure-behaviour` tells a refusal from a fault and
  chooses how absence is answered.
- `oo-choosing-composition-over-inheritance` decides when to hold an
  object instead of extending a class.
- `oo-encapsulating-state-and-behaviour` keeps an invariant with the
  state it guards.
- `oo-assigning-responsibilities` gives a behaviour to the object that
  holds its information.
- `oo-patterns-the-language-provides` shows when a language feature
  replaces a pattern.

## Further reading

- [Cases and absence](references/cases-and-absence.md)
