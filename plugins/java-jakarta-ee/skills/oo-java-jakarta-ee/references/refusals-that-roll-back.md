# Refusals That Roll Back

This file follows rule 4 through one use case: a clinician records a
visit on a scheduled appointment. The first version uses a CDI bean
whose `@Transactional` method stores the visit and then asks the
appointment to complete; the appointment refuses because it is already
completed, and the checked exception commits the store. The change asks
the appointment first and names the refusal in `rollbackOn`, so a
refusal leaves nothing written and a later refusal after a store undoes
it.

- [The types](#the-types)
- [The use case as it is](#the-use-case-as-it-is)
- [The use case after the change](#the-use-case-after-the-change)

## The types

```java
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Entity
class ScheduledAppointment {
    @Id
    @GeneratedValue
    private Long id;
    private boolean completed;
    @OneToMany(cascade = CascadeType.ALL)
    private List<VisitRecord> visits = new ArrayList<>();

    protected ScheduledAppointment() {
    }

    void recordVisit(Instant at) {
        visits.add(new VisitRecord(at));
    }

    void complete() throws VisitAlreadyRecorded {
        if (completed) {
            throw new VisitAlreadyRecorded(id);
        }
        completed = true;
    }
}

@Entity
class VisitRecord {
    @Id
    @GeneratedValue
    private Long id;
    private Instant recordedAt;

    protected VisitRecord() {
    }

    VisitRecord(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }
}

interface AppointmentStore {
    Optional<ScheduledAppointment> findById(long id);

    void save(ScheduledAppointment appointment);
}
```

`ScheduledAppointment` is the aggregate root: its `visits` list holds
the visit records, and `complete` refuses a second completion. The
appointment is loaded by the use case; its creation is outside this
file. `VisitRecord` is the stored record inside that aggregate.
`AppointmentStore` is the domain's repository; an adapter at the edge
implements it and stores the whole appointment under the appointment's
id, and this file leaves that adapter out. The types are shown in one
file for reading; a project puts each type in its own file. The two
entities are non-final because Jakarta Persistence 3.2 section 2.1
requires it, which relaxes `oo-java` rule 7.

## The use case as it is

```java
public class VisitAlreadyRecorded extends Exception {
    public VisitAlreadyRecorded(Long appointmentId) {
        super("appointment " + appointmentId + " already recorded");
    }
}
```

`VisitAlreadyRecorded` is the aggregate's checked refusal. It imports
nothing from Jakarta: the domain type carries no container annotation.

```java
import jakarta.enterprise.context.Dependent;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;

@Dependent
public class VisitRecording {
    private final AppointmentStore appointments;

    public VisitRecording() {
        this(null);
    }

    @Inject
    public VisitRecording(AppointmentStore appointments) {
        this.appointments = appointments;
    }

    @Transactional
    public void record(long appointmentId, Instant at)
            throws VisitAlreadyRecorded {
        ScheduledAppointment appointment =
            appointments.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "no appointment " + appointmentId));
        appointment.recordVisit(at);
        appointments.save(appointment);
        appointment.complete();
    }
}
```

`VisitRecording` is the use case as a CDI bean. It declares the
`@Dependent` scope (CDI 4.1 section 2.4.4), and `@Transactional` is a
bound interceptor, so CDI 4.1 section 3.10 asks its bean type to be
proxyable. The class is non-final and keeps a non-private no-argument
constructor that no code of yours calls, which relaxes `oo-java` rule
7; the proxy needs both. The `@Inject` constructor receives the store.

`record` runs in one container transaction that `@Transactional` starts
with `TxType.REQUIRED` (Jakarta Transactions 2.0 section 3.7). It loads
the scheduled appointment by its id, adds a `VisitRecord` inside it,
and stores the whole appointment through `AppointmentStore` under the
appointment's id, in the appointment table and the visit record table,
inside that transaction. The appointment is already completed, so
`complete` refuses with `VisitAlreadyRecorded` after the store. The
refusal is a checked exception and `record` names no `rollbackOn`, so
the transactional interceptor does not mark the transaction for
rollback (section 3.7), and the container commits the visit record.

## The use case after the change

The refusal does not change: it is the `VisitAlreadyRecorded` above,
with no Jakarta import and no container annotation.

```java
import jakarta.enterprise.context.Dependent;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;

@Dependent
public class VisitRecording {
    private final AppointmentStore appointments;

    public VisitRecording() {
        this(null);
    }

    @Inject
    public VisitRecording(AppointmentStore appointments) {
        this.appointments = appointments;
    }

    @Transactional(rollbackOn = VisitAlreadyRecorded.class)
    public void record(long appointmentId, Instant at)
            throws VisitAlreadyRecorded {
        ScheduledAppointment appointment =
            appointments.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "no appointment " + appointmentId));
        appointment.complete();
        appointment.recordVisit(at);
        appointments.save(appointment);
    }
}
```

`VisitRecording` is the same bean: `@Dependent`, non-final and with a
non-private no-argument constructor because its `@Transactional` method
is a bound interceptor (CDI 4.1 section 3.10), which relaxes `oo-java`
rule 7.

`record` loads the appointment, asks it to complete before anything
changes, then adds the visit and stores the whole appointment through
`AppointmentStore` under the appointment's id, in the appointment table
and the visit record table, inside the same container transaction. A
refusal from `complete` happens before the visit is added or stored, so
no write happens. The `rollbackOn` element names `VisitAlreadyRecorded`;
it is the guard for a refusal that comes after a change, and the order
above keeps this use case's refusal before the write. If the store
fails, the transaction rolls back the appointment's completion too, and
the two changes commit or fail together. The state keeps rule 4: a
refusal before the write leaves nothing written, and a refusal that
comes after a change rolls the transaction back.
