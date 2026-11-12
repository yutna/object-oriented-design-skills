# Refusals That Roll Back

This file follows rule 4 through one use case: a clinician records a
visit on a scheduled appointment. The first version uses a
container-managed enterprise bean, stores the visit and then asks the
appointment to complete; the appointment refuses because it is already
completed, and the checked exception commits the store. The change asks
the appointment first and marks the refusal to roll back, so a refusal
leaves nothing written and a later refusal after a store undoes it.

- [The types](#the-types)
- [The use case as it is](#the-use-case-as-it-is)
- [The refusal after the change](#the-refusal-after-the-change)
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

```java
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import java.time.Instant;

@Stateless
public class VisitRecording {
    private final AppointmentStore appointments;

    public VisitRecording() {
        this(null);
    }

    @Inject
    public VisitRecording(AppointmentStore appointments) {
        this.appointments = appointments;
    }

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

`VisitRecording` is the use case, and the container manages its
transaction: `@Stateless` is container-managed by default (Jakarta
Enterprise Beans 4.0 section 8.3.1), and `record` gets `REQUIRED`
because no transaction attribute is given (section 8.3.7). The public
no-argument constructor is the enterprise bean container's requirement;
the `@Inject` constructor receives the store. The class is non-final
because the enterprise bean container requires a non-final class,
which relaxes `oo-java` rule 7.

`record` loads the scheduled appointment by its id, adds a `VisitRecord`
inside it and stores the whole appointment through `AppointmentStore`
under the appointment's id, in the appointment table and the visit
record table, inside the container-managed transaction the `@Stateless`
bean starts. The appointment is already completed, so `complete` refuses
with `VisitAlreadyRecorded` after the store. The exception is a checked
exception listed in `record`'s `throws` clause, so it is an application
exception, and its class has no `@ApplicationException(rollback =
true)`: the container does not mark the transaction for rollback and
commits the visit record (section 9.2.1).

## The refusal after the change

```java
import jakarta.ejb.ApplicationException;

@ApplicationException(rollback = true)
public final class VisitAlreadyRecorded extends Exception {
    public VisitAlreadyRecorded(Long appointmentId) {
        super("appointment " + appointmentId + " already recorded");
    }
}
```

The refusal is the same checked exception with
`@ApplicationException(rollback = true)`. The annotation sits on the
exception class, so the container marks the transaction for rollback
when a container-managed enterprise bean method throws it (section
9.2.1), and a refusal raised after a store undoes the store. The class
is final, which keeps `oo-java` rule 7.

## The use case after the change

```java
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import java.time.Instant;

@Stateless
public class VisitRecording {
    private final AppointmentStore appointments;

    public VisitRecording() {
        this(null);
    }

    @Inject
    public VisitRecording(AppointmentStore appointments) {
        this.appointments = appointments;
    }

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

`record` loads the appointment, asks it to complete first, then adds the
visit and stores the whole appointment under the appointment's id, in
the appointment table and the visit record table, inside the same
container-managed transaction. A refusal from `complete` happens before
the visit is added or stored, so no write happens; the exception's
annotation also makes a refusal raised after the store roll the
transaction back, so the visit and the completion are not stored. If
the store fails, the transaction rolls back the appointment's
completion too, and the two changes commit or fail together. The state
keeps rule 4: a refusal before the write leaves nothing written, and
the annotated refusal makes a later refusal undo the write.
