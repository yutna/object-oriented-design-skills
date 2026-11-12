# Transactions Through the Proxy

This file follows rule 3 through one use case: a clinician signs a visit
note, and the note is delivered to the patient portal as a separate
unit. The first version reaches the delivery through the same object,
so the call never enters the proxy. The change moves the delivery to
another bean, and each unit then changes one aggregate in its own
transaction.

- [The types](#the-types)
- [The use case as it is](#the-use-case-as-it-is)
- [The delivery as its own bean](#the-delivery-as-its-own-bean)
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
note with the signing time. `NoteDelivery` records that a note reached
the portal, and it is the root of its own aggregate. The two interfaces
are the domain's repositories, declared in domain types.

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

## The delivery as its own bean

```java
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public class NoteDeliveryService {
    private final NoteDeliveries deliveries;

    public NoteDeliveryService(NoteDeliveries deliveries) {
        this.deliveries = deliveries;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(VisitNote note) {
        deliveries.save(new NoteDelivery(note.id(), note.signedAt()));
    }
}
```

`NoteDeliveryService` holds the delivery unit and nothing else. A
configuration class builds it through this constructor the way the
pattern builds `RefillEligibility`, and the bean the context returns is
the proxy that carries the transaction advice.

## The use case after the change

```java
import java.time.Instant;
import org.springframework.transaction.annotation.Transactional;

public class NoteSigning {
    private final VisitNotes notes;
    private final NoteDeliveryService delivery;

    public NoteSigning(VisitNotes notes, NoteDeliveryService delivery) {
        this.notes = notes;
        this.delivery = delivery;
    }

    @Transactional
    public void sign(long noteId, Instant signedAt) {
        VisitNote note = notes.findById(noteId)
            .orElseThrow(() -> new IllegalArgumentException(
                "no note " + noteId));
        VisitNote signed = note.sign(signedAt);
        notes.save(signed);
        delivery.deliver(signed);
    }
}
```

`sign` now calls `delivery.deliver`, an ordinary method call on an
injected collaborator, so the call enters the delivery bean's proxy.
`REQUIRES_NEW` starts an independent physical transaction there, and
the signing transaction changes only the visit note. `sign` stores the
signed note by its id in the visit note repository in the signing
transaction, and `delivery.deliver` stores a delivery by the note's id
in the delivery repository in its own `REQUIRES_NEW` transaction. Each
unit changes one aggregate in its own transaction, as rule 3 asks.
