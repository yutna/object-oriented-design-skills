package clinic;

import java.time.LocalDateTime;

public final class Slot {
    private final String id;
    private final String clinicianId;
    private final LocalDateTime start;
    private final LocalDateTime end;

    public Slot(String id, String clinicianId, LocalDateTime start,
            LocalDateTime end) {
        this.id = id;
        this.clinicianId = clinicianId;
        this.start = start;
        this.end = end;
    }

    public String id() {
        return id;
    }

    public String clinicianId() {
        return clinicianId;
    }

    public LocalDateTime start() {
        return start;
    }

    public LocalDateTime end() {
        return end;
    }
}
