# Routing Cases

Symptoms in the words a clinic team would use, each with the skill that
should answer it. This is a keyword check on skill names and
descriptions, not a test of how an agent routes.

Format: `symptom -> expected-skill`, split on the last arrow.

```text
we need to size this appointment design work -> oo-design
we are unsure which design rule applies to this clinic -> oo-design
starting a new clinic service needs design help -> oo-design
which class owns the appointment reminder -> oo-assigning-responsibilities
where does this new visit method belong -> oo-assigning-responsibilities
our visit class has grown to do too much -> oo-assigning-responsibilities
where should this reminder behaviour live -> oo-assigning-responsibilities
this clinic design has one class doing too much -> oo-assigning-responsibilities
the visit handler decides if a slot is free -> oo-assigning-responsibilities
we are starting this design with one class for visits -> oo-design
which object should hold the booking rule -> oo-assigning-responsibilities
should the schedule create the appointment -> oo-assigning-responsibilities
every change to booking touches five other classes -> oo-diagnosing-coupling
these two clinic modules always change together -> oo-diagnosing-coupling
our patient class is only getters and setters -> oo-deciding-object-or-data
should this intake form be a class or just a map -> oo-deciding-object-or-data
every new insurer means editing the invoice code -> oo-encapsulating-what-varies
how flexible should the reminder module be -> oo-encapsulating-what-varies
callers check appointment status first -> oo-encapsulating-state-and-behaviour
any code can set a slot back to free -> oo-encapsulating-state-and-behaviour
a new slot exists before its times are set -> oo-constructing-valid-objects
appointment constructor takes eleven arguments -> oo-constructing-valid-objects
patient ids are plain strings everywhere -> oo-modeling-values-and-entities
changing one visit's duration changed another visit -> oo-modeling-values-and-entities
two patient records with the same id do not compare equal -> oo-modeling-values-and-entities
every clinic subclass breaks when the base visit class changes -> oo-choosing-composition-over-inheritance
should telehealth visit extend visit or wrap it -> oo-choosing-composition-over-inheritance
we subclass the reminder sender just to reuse one method -> oo-choosing-composition-over-inheritance
the subclass throws where the parent class did not -> oo-honouring-substitutability
a subclass refuses a method its parent promises -> oo-honouring-substitutability
code checks which subtype of slot it got before calling it -> oo-honouring-substitutability
the same switch on visit type appears in six places -> oo-replacing-conditionals-with-polymorphism
every appointment method branches on its status -> oo-replacing-conditionals-with-polymorphism
should visit kinds be subclasses or a sealed type with matching -> oo-replacing-conditionals-with-polymorphism
the invoice reaches through appointment to slot to clinician -> oo-limiting-what-an-object-knows
this booking class only forwards calls to the calendar -> oo-limiting-what-an-object-knows
this method uses the patient's data more than its own -> oo-limiting-what-an-object-knows
what should we call the class that books appointments -> oo-naming-classes-and-methods
our classes are named ClinicManager, SlotHelper and DateUtil -> oo-naming-classes-and-methods
method names like process and handle say nothing -> oo-naming-classes-and-methods
the scheduling interface has twenty methods and each caller uses two -> oo-designing-interfaces
we copied every public method of the class into an interface -> oo-designing-interfaces
should the reminder channel be an interface or an abstract class -> oo-designing-interfaces
the appointment class imports the database client directly -> oo-inverting-dependencies
classes fetch their collaborators from a global registry -> oo-inverting-dependencies
where should all these objects be created and wired together -> oo-inverting-dependencies
every caller knows slots are stored as fifteen-minute blocks -> oo-hiding-implementation
callers must handle the database's own error codes -> oo-hiding-implementation
this class exposes ten small steps that callers must call in order -> oo-hiding-implementation
a referral can be accepted and declined at the same time -> oo-making-illegal-states-impossible
the cancellation reason is filled in on appointments nobody cancelled -> oo-making-illegal-states-impossible
three booleans on the visit allow eight states but only three are real -> oo-making-illegal-states-impossible
a small clinic change still needs design work -> oo-design
the staff say no-show but the code says status four -> oo-speaking-the-domain-language
the nurses talk about recalls but nothing in the code models them -> oo-speaking-the-domain-language
billing and reception both say appointment but mean different things -> oo-speaking-the-domain-language
```

## Known misses

A routing line that misses the gate is kept here as a note, never as a
case.

```text
```
