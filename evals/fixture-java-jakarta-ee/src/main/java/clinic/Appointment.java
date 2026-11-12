package clinic;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import java.time.Instant;

@Entity
public class Appointment {
    @Id
    @GeneratedValue
    private Long id;
    private String patientId;
    private Instant startsAt;

    protected Appointment() {
    }

    public Appointment(String patientId, Instant startsAt) {
        this.patientId = patientId;
        this.startsAt = startsAt;
    }

    public Long getId() { return id; }
    public String getPatientId() { return patientId; }
    public Instant getStartsAt() { return startsAt; }
}
