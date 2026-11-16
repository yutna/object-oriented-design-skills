package clinic;

/** Talks to the car park's permit server; a call can take several seconds. */
public interface PermitDesk {
    void issue(String visitId);
}
