# Transactions Through the Proxy

This file follows rule 3 through one use case: a clinician signs a visit
note, and the note is delivered to the patient portal as a separate
unit. The first version reaches the delivery through the same object,
so the call never enters the proxy. The change reaches the delivery
through another bean after the signing transaction has committed, so
each unit changes one aggregate in its own transaction and the delivery
starts only after the signing has committed.

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
are the domain's repositories, declared in domain types; an adapter at
the edge implements each and delegates to a Spring Data interface, which
this file leaves out.

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
import org.springframework.transaction.annotation.Transactional;

public class NoteDeliveryService {
    private final NoteDeliveries deliveries;

    public NoteDeliveryService(NoteDeliveries deliveries) {
        this.deliveries = deliveries;
    }

    @Transactional
    public void deliver(VisitNote note) {
        deliveries.save(new NoteDelivery(note.id(), note.signedAt()));
    }
}
```

`NoteDeliveryService` holds the delivery unit and nothing else.
`deliver` stores a delivery under the note's id in the delivery
repository, inside the transaction its own `@Transactional` opens. The
method is public and lives on another bean, so the call from the use
case enters the proxy and gets that transaction, and the signing
transaction has already committed when the call is made. If the signing
fails at flush or commit, the call never happens and no delivery is
stored. A configuration class builds `NoteDeliveryService` through this
constructor the way the pattern builds `RefillEligibility`, and the
context returns a class-based proxy for it, which carries the
transaction advice.

## The use case after the change

```java
import java.time.Instant;
import org.springframework.transaction.annotation.Transactional;

public class NoteSigning {
    private final VisitNotes notes;

    public NoteSigning(VisitNotes notes) {
        this.notes = notes;
    }

    @Transactional
    public VisitNote sign(long noteId, Instant signedAt) {
        VisitNote note = notes.findById(noteId)
            .orElseThrow(() -> new IllegalArgumentException(
                "no note " + noteId));
        VisitNote signed = note.sign(signedAt);
        notes.save(signed);
        return signed;
    }
}
```

`sign` stores the signed note by its id in the visit note repository,
inside the transaction its own `@Transactional` opens. It returns the
signed note, so the caller holds it after this transaction has
committed.

```java
import java.time.Instant;

public class SignAndDeliverNote {
    private final NoteSigning signing;
    private final NoteDeliveryService delivery;

    public SignAndDeliverNote(
            NoteSigning signing, NoteDeliveryService delivery) {
        this.signing = signing;
        this.delivery = delivery;
    }

    public void signAndDeliver(long noteId, Instant signedAt) {
        VisitNote signed = signing.sign(noteId, signedAt);
        delivery.deliver(signed);
    }
}
```

`SignAndDeliverNote` is the use case's entry point, and `signAndDeliver`
carries no `@Transactional`, so the two calls do not share a transaction.
It calls `NoteSigning.sign` through that bean's proxy, whose transaction
commits when `sign` returns; then it calls `NoteDeliveryService.deliver`
through that bean's proxy, which opens a second transaction and changes
only the delivery. The second transaction starts only after the first has
committed. If the delivery fails, its transaction rolls back: the note
stays signed and no delivery is stored. It stores only through those
two calls. Each unit changes one aggregate in its own transaction, and
that state keeps rule 3.
