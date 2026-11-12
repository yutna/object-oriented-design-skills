package clinic;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    long countByClinicianIdAndStartsAtBetween(
        String clinicianId, Instant from, Instant to);
}
