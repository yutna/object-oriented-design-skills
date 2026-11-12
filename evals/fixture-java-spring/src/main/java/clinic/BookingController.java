package clinic;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BookingController {
    private final AppointmentRepository appointments;

    public BookingController(AppointmentRepository appointments) {
        this.appointments = appointments;
    }

    @PostMapping("/appointments")
    public ResponseEntity<Long> book(@RequestBody BookingRequest request) {
        Appointment appointment = appointments.save(new Appointment(
            request.clinicianId(), request.patientId(), request.startsAt()));
        return ResponseEntity.ok(appointment.getId());
    }
}
