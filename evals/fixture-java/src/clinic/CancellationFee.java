package clinic;

public final class CancellationFee {
    public long amountInCents(Appointment appointment) {
        if ("CANCELLED".equals(appointment.status())) {
            return 2500L;
        }
        return 0L;
    }
}
