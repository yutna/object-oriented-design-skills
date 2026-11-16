package clinic;

import java.time.Duration;

public record Visit(String id, String patientName, Duration bookedLength) {
}
