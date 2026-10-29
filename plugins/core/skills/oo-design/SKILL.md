---
name: oo-design
description: Use when starting a new module, feature or system in an object-oriented codebase, sizing design, or unsure which object rule applies.
license: MIT
metadata:
  version: 0.12.0
  pack: object-oriented-design-skills
---

# Object-Oriented Design

## Overview

The pack is design rules for codebases written in an object-oriented
style, not universal advice. A project's own written conventions win over
the pack. Follow the idiom of the module being changed. This skill sizes
the task and names the skill that fits.

## How much design a task warrants

|Task|Use|Skip|
|---|---|---|
|An answer used once, then thrown away|Nothing|Everything|
|One method in a class that exists|Its name and its contract|Remodelling|
|A feature inside an existing flow|The idiom that flow uses|New boundaries|
|A new class or module|The design loop|Nothing|
|A new context|The loop, then its boundaries|Nothing|
|A new system from nothing|The loop, contexts, then structure|Nothing|

## Before designing

Before designing, state the gate: one rule the software must follow,
with one example it accepts and one it rejects. For example, "A slot can
hold at most one appointment." It accepts booking a second patient into
a different slot and rejects booking a second patient into the same
slot. If you can write the rule down, start. If you cannot, what is
missing is not design, and this pack cannot supply it.

## The design loop

1. Say what the software must do in the domain's words
   ([speaking the domain language](../oo-speaking-the-domain-language/SKILL.md)),
   and find the object that knows what each behaviour needs
   ([assigning responsibilities](../oo-assigning-responsibilities/SKILL.md)).
2. Find the consistency boundary: what must be true together in one
   transaction
   ([designing aggregates](../oo-designing-aggregates/SKILL.md)).
3. Decide where each rule lives: an entity, a value object, or a domain
   service ([placing domain logic](../oo-placing-domain-logic/SKILL.md)).
4. Design the messages each object answers
   ([encapsulating state and behaviour](../oo-encapsulating-state-and-behaviour/SKILL.md)),
   and make illegal states impossible to construct
   ([making illegal states impossible](../oo-making-illegal-states-impossible/SKILL.md)).
5. Invert dependencies so the domain knows nothing of the database or
   the framework
   ([inverting dependencies](../oo-inverting-dependencies/SKILL.md),
   [layering the system](../oo-layering-the-system/SKILL.md)).
6. Name things in the domain's words, and comment only what the code
   cannot say
   ([naming classes and methods](../oo-naming-classes-and-methods/SKILL.md)).
7. Check the result against the red flags below.

## How strictly a rule is meant

Every core rule in this pack carries one of three labels, and the label
says how strictly it is meant.

- **Rule.** Breaking it is a defect. No framework excuses it.
- **Default.** Do this unless a stated condition holds. The condition is
  its own sentence, never a trailing clause.
- **Judgement.** Two answers are defensible. The skill says what tips the
  balance.

## Symptoms to skills

Symptoms point to the skill that treats them, and this table grows as
skills land.

|Symptom|Skill|
|---|---|
|Which class should do this?|[Assigning responsibilities][assigning]|
|This class does too much|[Assigning responsibilities][assigning]|
|A change ripples through many classes|[Diagnosing coupling][coupling]|
|How tightly are these two parts tied?|[Diagnosing coupling][coupling]|
|Is this an object or just data?|[Deciding object or data][object-or-data]|
|Our domain model is anemic|[Deciding object or data][object-or-data]|
|Other code decides for this object|[Encapsulating state and behaviour][state-and-behaviour]|
|Setters let this object break its rules|[Encapsulating state and behaviour][state-and-behaviour]|
|This object can exist half-built|[Constructing valid objects][constructing]|
|This constructor takes too many arguments|[Constructing valid objects][constructing]|
|Every new case means editing working code|[Encapsulating what varies][what-varies]|
|How much flexibility should this have?|[Encapsulating what varies][what-varies]|
|Is this a value or an entity?|[Modeling values and entities][values]|
|Raw strings and numbers carry domain rules|[Modeling values and entities][values]|
|Should this extend that class or hold it?|[Choosing composition over inheritance][composition]|
|Changing a base class breaks its subclasses|[Choosing composition over inheritance][composition]|
|A subclass breaks what its parent promises|[Honouring substitutability][substitutability]|
|Code checks which subtype it holds|[Honouring substitutability][substitutability]|
|The same switch on a type keeps coming back|[Replacing conditionals with polymorphism][polymorphism]|
|Subclasses or pattern matching?|[Replacing conditionals with polymorphism][polymorphism]|
|Code reaches through a chain of objects|[Limiting what an object knows][knows]|
|This class only forwards calls|[Limiting what an object knows][knows]|
|What should this class or method be called?|[Naming classes and methods][naming]|
|Names like Manager, Helper or Util|[Naming classes and methods][naming]|
|Callers depend on interface methods they never use|[Designing interfaces][interfaces]|
|Interface or abstract base class?|[Designing interfaces][interfaces]|
|Domain code depends on a database or framework|[Inverting dependencies][inverting]|
|Where are objects created and wired together?|[Inverting dependencies][inverting]|
|Callers know how another class stores or formats data|[Hiding implementation][hiding]|
|A class leaks its internal errors or steps|[Hiding implementation][hiding]|
|Flags or optional fields allow impossible combinations|[Making illegal states impossible][illegal-states]|
|A type admits values the domain never has|[Making illegal states impossible][illegal-states]|
|The code's words differ from the staff's|[Speaking the domain language][domain-language]|
|One word means different things to two teams|[Speaking the domain language][domain-language]|
|Which objects must change together?|[Designing aggregates][aggregates]|
|Saves collide or one load pulls in too much|[Designing aggregates][aggregates]|
|Which status changes are allowed?|[Modeling lifecycles][lifecycles]|
|A cancelled or closed object changes again|[Modeling lifecycles][lifecycles]|
|How should domain objects be stored and found?|[Designing repositories][repositories]|
|The repository has a find method per screen|[Designing repositories][repositories]|
|Use cases repeat the same business check|[Placing domain logic][placing]|
|Domain service, entity method or application service?|[Placing domain logic][placing]|
|Other parts must react after a change is saved|[Publishing domain events][events]|
|A message went out for a change that rolled back|[Publishing domain events][events]|
|Where does one team's model end and another's begin?|[Bounding contexts][contexts]|
|Which parts are core, and which can we buy?|[Bounding contexts][contexts]|
|Which way should the layers depend?|[Layering the system][layering]|
|A screen or job cannot be tested without its framework|[Layering the system][layering]|
|Modules depend on each other in a cycle|[Organising modules][modules]|
|Modular monolith or separate services?|[Organising modules][modules]|
|A change to our API breaks the apps that call it|[Crossing system boundaries][boundaries]|
|How should we version this API or message?|[Crossing system boundaries][boundaries]|
|The mapping tool shapes our domain classes|[Taming persistence][persistence]|
|A list runs one query per row|[Taming persistence][persistence]|
|Screens need data shaped unlike the model|[Separating reads from writes][reads]|
|Read model, projection or event sourcing?|[Separating reads from writes][reads]|
|MVC, MVP or MVVM for this screen?|[Separating presentation from domain][presentation]|
|A screen edits domain objects directly|[Separating presentation from domain][presentation]|
|Which design pattern fits this problem?|[Choosing a pattern][choosing-pattern]|
|A pattern was added before its problem|[Choosing a pattern][choosing-pattern]|
|These pattern classes could be a function|[Patterns the language provides][language-patterns]|
|Visitor, or a closed set with matching?|[Patterns the language provides][language-patterns]|

[aggregates]: ../oo-designing-aggregates/SKILL.md
[assigning]: ../oo-assigning-responsibilities/SKILL.md
[boundaries]: ../oo-crossing-system-boundaries/SKILL.md
[choosing-pattern]: ../oo-choosing-a-pattern/SKILL.md
[composition]: ../oo-choosing-composition-over-inheritance/SKILL.md
[constructing]: ../oo-constructing-valid-objects/SKILL.md
[contexts]: ../oo-bounding-contexts/SKILL.md
[coupling]: ../oo-diagnosing-coupling/SKILL.md
[domain-language]: ../oo-speaking-the-domain-language/SKILL.md
[events]: ../oo-publishing-domain-events/SKILL.md
[hiding]: ../oo-hiding-implementation/SKILL.md
[illegal-states]: ../oo-making-illegal-states-impossible/SKILL.md
[interfaces]: ../oo-designing-interfaces/SKILL.md
[inverting]: ../oo-inverting-dependencies/SKILL.md
[knows]: ../oo-limiting-what-an-object-knows/SKILL.md
[language-patterns]: ../oo-patterns-the-language-provides/SKILL.md
[layering]: ../oo-layering-the-system/SKILL.md
[lifecycles]: ../oo-modeling-lifecycles/SKILL.md
[modules]: ../oo-organising-modules/SKILL.md
[naming]: ../oo-naming-classes-and-methods/SKILL.md
[object-or-data]: ../oo-deciding-object-or-data/SKILL.md
[persistence]: ../oo-taming-persistence/SKILL.md
[placing]: ../oo-placing-domain-logic/SKILL.md
[polymorphism]: ../oo-replacing-conditionals-with-polymorphism/SKILL.md
[presentation]: ../oo-separating-presentation-from-domain/SKILL.md
[reads]: ../oo-separating-reads-from-writes/SKILL.md
[repositories]: ../oo-designing-repositories/SKILL.md
[state-and-behaviour]: ../oo-encapsulating-state-and-behaviour/SKILL.md
[substitutability]: ../oo-honouring-substitutability/SKILL.md
[values]: ../oo-modeling-values-and-entities/SKILL.md
[what-varies]: ../oo-encapsulating-what-varies/SKILL.md

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A class named Manager, Helper or Util.
- A method that asks another object for its data and then decides for
  it.
- A constructor that leaves the object unusable until a setter runs.
- One business rule whose change touches many classes.
- A test that needs many mocks to check one decision.

## Further reading

- [Notation](references/notation.md)
- [The CLAUDE.md block](references/claude-md-block.md)
- [Pattern index](references/pattern-index.md)
