package clinic;

import java.time.LocalDateTime;

public final class Appointment {
    private final String id;
    private final String patientId;
    private final LocalDateTime start;
    private String status;

    public Appointment(String id, String patientId, LocalDateTime start) {
        this.id = id;
        this.patientId = patientId;
        this.start = start;
        this.status = "BOOKED";
    }

    public void cancel() {
        this.status = "CANCELLED";
    }

    public String id() {
        return id;
    }

    public String patientId() {
        return patientId;
    }

    public LocalDateTime start() {
        return start;
    }

    public String status() {
        return status;
    }
}
