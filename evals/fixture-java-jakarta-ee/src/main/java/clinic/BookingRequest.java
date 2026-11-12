package clinic;

import java.time.Instant;

public record BookingRequest(String patientId, Instant startsAt) {
}
