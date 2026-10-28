# Context maps

A context map is the written record of how the clinic's contexts fit
together. It names each pair that talks, which side depends on the
other, and the relationship that decides who must be asked before a
change. Without it, every new team member learns the dependencies by
breaking them.

## The clinic's contexts

- Scheduling owns slots and appointments. It decides when a clinician
  can see a patient, and it publishes `AppointmentCompleted` when a
  visit ends.
- Clinical records owns the patient's chart: the visits, notes and
  prescriptions that make up the clinic's own record of care.
- Billing owns invoices and billable visits. It prices what the clinic
  did, in billing's own words.
- The outside pharmacy's dispensing service owns what happens after a
  prescription leaves the clinic. It is another organisation's system,
  and the clinic does not change its model.

## The relationships

- **Conformist.** The depending context takes the other context's model
  and words as they are, with no translation of its own.
- **Anti-corruption layer.** The depending context keeps its own model
  and puts one translator at its edge; no class beyond that translator
  names the other model.
- **Shared kernel.** Two teams own a small model together and change it
  together, while the rest of each model stays separate.
- **Open host with a published language.** The depended-on context
  publishes one stable interface and one message language for every
  consumer, rather than a separate interface for each.
- **Separate ways.** The pair exchanges nothing, because each side's
  work is complete without the other.

## The map

The table lists every pair that talks and, in its last row, a pair that
deliberately does not.

|Depended on|Depends|Relationship|Reason|
|---|---|---|---|
|Scheduling|Clinical records|Conformist|A visit follows its appointment.|
|Scheduling|Billing|Anti-corruption layer|Billing prices a visit.|
|Both|Both|Shared kernel|One patient identity.|
|Pharmacy|Clinical records|Open host with a published language|One language.|
|Neither|Neither|Separate ways|Nothing crosses.|

The table calls the outside pharmacy's dispensing service Pharmacy. The
conformist line rests on a visit happening in the appointment scheduling
booked, so clinical records takes scheduling's identity and status as
published. Billing's anti-corruption layer exists because billing prices
a billable visit, not a booked slot. The shared kernel is the patient
identity both teams need. The open host is the pharmacy's one dispensing
interface and one message language, which serve every clinic. Scheduling
and the pharmacy choose separate ways because a prescription leaves
clinical records, and scheduling neither knows nor asks what the
pharmacy dispenses.

The shared kernel is the one row with no single depended-on side: both
teams own that small model, and either team's change to it needs the
other's agreement.

## How the map changes who must agree

A conformist line leaves the decision with the depended-on team. When
its model changes, the depending team updates at its next release and
has no veto; if that becomes painful, it moves to an anti-corruption
layer. An anti-corruption layer also lets the depended-on team change
its inner model freely, but the translator's team must update the
translator and its tests, and the two teams agree only on the published
interface or event.

A shared kernel needs both teams' agreement before any change to the
shared model, so keep it small; every change costs two releases. An open
host puts the agreement in one place: the publisher must keep its
published language stable and version a change, while consumers agree
with that language rather than with each other. Separate ways needs no
agreement at all; if the pair later has something to say, choose one of
the other four relationships and write it down.

## Signs a line is drawn in the wrong place

- One change needs two teams' releases: either the boundary runs through
  one meaning, or the shared kernel has grown past small.
- A word changes meaning inside one context: the boundary is too coarse,
  so split it where the meaning changes.
- A translator grows business decisions: either it has become a context
  of its own, or the boundary was drawn on the wrong side.
