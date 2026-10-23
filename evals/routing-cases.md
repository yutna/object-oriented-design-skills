# Routing Cases

Symptoms in the words a clinic team would use, each with the skill that
should answer it. This is a keyword check on skill names and
descriptions, not a test of how an agent routes.

Format: `symptom -> expected-skill`, split on the last arrow.

```text
we need to size this appointment design work -> oo-design
we are unsure which design rule applies to this clinic -> oo-design
starting a new clinic service needs design help -> oo-design
a small clinic change still needs design work -> oo-design
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
```

## Known misses

A routing line that misses the gate is kept here as a note, never as a
case.

```text
```
