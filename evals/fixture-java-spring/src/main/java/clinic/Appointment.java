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
    private String clinicianId;
    private String patientId;
    private Instant startsAt;

    protected Appointment() {
    }

    public Appointment(String clinicianId, String patientId, Instant startsAt) {
        this.clinicianId = clinicianId;
        this.patientId = patientId;
        this.startsAt = startsAt;
    }

    public Long getId() { return id; }
    public String getClinicianId() { return clinicianId; }
    public String getPatientId() { return patientId; }
    public Instant getStartsAt() { return startsAt; }
}
