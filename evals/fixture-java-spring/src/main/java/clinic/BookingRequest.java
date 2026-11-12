package clinic;

import java.time.Instant;

public record BookingRequest(String clinicianId, String patientId, Instant startsAt) {
}
