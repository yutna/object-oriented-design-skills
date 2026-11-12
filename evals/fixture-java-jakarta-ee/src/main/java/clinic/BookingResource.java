package clinic;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;

@Path("/appointments")
public class BookingResource {
    @Inject
    Appointments appointments;

    @POST
    @Transactional
    public Response book(BookingRequest request) {
        Appointment appointment =
            new Appointment(request.patientId(), request.startsAt());
        appointments.add(appointment);
        return Response.ok(appointment.getId()).build();
    }
}
