# Transactions Through the Proxy

This file follows rule 3 through one use case: a clinician signs a visit
note, and the note is delivered to the patient portal as a separate
unit. The first version reaches the delivery through the same object,
so the call never enters the proxy. The change publishes an event and
handles it after the signing transaction commits, so each unit changes
one aggregate in its own transaction and the delivery starts only after
the signing has committed.

- [The types](#the-types)
- [The use case as it is](#the-use-case-as-it-is)
- [The delivery after the commit](#the-delivery-after-the-commit)
- [The use case after the change](#the-use-case-after-the-change)

## The types

```java
import java.time.Instant;
import java.util.Optional;

record VisitNote(long id, Instant signedAt) {
    VisitNote sign(Instant at) {
        return new VisitNote(id, at);
    }
}

record NoteSigned(long noteId, Instant signedAt) {
}

record NoteDelivery(long noteId, Instant deliveredAt) {
}

interface VisitNotes {
    Optional<VisitNote> findById(long id);

    void save(VisitNote note);
}

interface NoteDeliveries {
    void save(NoteDelivery delivery);
}
```

`VisitNote` is the visit note aggregate, and signing it answers a new
note with the signing time. `NoteSigned` says which note was signed and
when; it is the event the use case publishes. `NoteDelivery` records
that a note reached the portal, and it is the root of its own
aggregate. The two interfaces are the domain's repositories, declared
in domain types; an adapter at the edge implements each and delegates
to a Spring Data interface, which this file leaves out.

## The use case as it is

```java
import java.time.Instant;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public class NoteSigning {
    private final VisitNotes notes;
    private final NoteDeliveries deliveries;

    public NoteSigning(VisitNotes notes, NoteDeliveries deliveries) {
        this.notes = notes;
        this.deliveries = deliveries;
    }

    @Transactional
    public void sign(long noteId, Instant signedAt) {
        VisitNote note = notes.findById(noteId)
            .orElseThrow(() -> new IllegalArgumentException(
                "no note " + noteId));
        VisitNote signed = note.sign(signedAt);
        notes.save(signed);
        deliver(signed);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(VisitNote note) {
        deliveries.save(new NoteDelivery(note.id(), note.signedAt()));
    }
}
```

`sign` runs in one transaction and changes the visit note. `deliver`
asks for `REQUIRES_NEW`, so its author meant the delivery to commit in
an independent physical transaction. The call `deliver(signed)` is a
call on `this`, which never enters the proxy, so the delivery joins the
transaction `sign` already opened. The delivery has no transaction of
its own, and a failure while it writes cannot roll back on its own.

`sign` stores the signed note by its id in the visit note repository
inside its transaction. It means `deliver` to store a delivery by the
note's id in the delivery repository in its own transaction, but the
self-call leaves that write in `sign`'s transaction.

## The delivery after the commit

```java
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

public class NoteDeliveryService {
    private final NoteDeliveries deliveries;

    public NoteDeliveryService(NoteDeliveries deliveries) {
        this.deliveries = deliveries;
    }

    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(NoteSigned event) {
        deliveries.save(new NoteDelivery(event.noteId(), event.signedAt()));
    }
}
```

`NoteDeliveryService` holds the delivery unit and nothing else.
`@TransactionalEventListener` binds `deliver` to the transaction that
publishes the event: with no phase set, it runs after that transaction
commits. The signing transaction has committed by then, but its
resources may still be bound to the thread, so a plain `@Transactional`
would join them and its changes would not commit; `REQUIRES_NEW` starts
an independent physical transaction instead. If the signing rolls back,
the event is discarded and no delivery is stored. A configuration class
builds `NoteDeliveryService` through this constructor the way the
pattern builds `RefillEligibility`, and the context returns a class-based
proxy for it, which carries the transaction advice.

## The use case after the change

```java
import java.time.Instant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

public class NoteSigning {
    private final VisitNotes notes;
    private final ApplicationEventPublisher events;

    public NoteSigning(VisitNotes notes, ApplicationEventPublisher events) {
        this.notes = notes;
        this.events = events;
    }

    @Transactional
    public void sign(long noteId, Instant signedAt) {
        VisitNote note = notes.findById(noteId)
            .orElseThrow(() -> new IllegalArgumentException(
                "no note " + noteId));
        VisitNote signed = note.sign(signedAt);
        notes.save(signed);
        events.publishEvent(
            new NoteSigned(signed.id(), signed.signedAt()));
    }
}
```

`sign` stores the signed note by its id in the visit note repository,
then publishes `NoteSigned` inside the signing transaction. The event is
bound to that transaction, so `NoteDeliveryService` handles it only
after the commit. The signing transaction changes only the visit note;
the delivery's `REQUIRES_NEW` transaction changes only the delivery and
starts only after the signing has committed. If the signing fails at
flush or commit, the event is discarded and no delivery is stored.
Each unit changes one aggregate in its own transaction, and that state
keeps rule 3.
