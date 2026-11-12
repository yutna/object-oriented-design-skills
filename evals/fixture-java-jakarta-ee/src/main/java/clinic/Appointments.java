package clinic;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;

@ApplicationScoped
public class Appointments {
    @PersistenceContext
    private EntityManager entityManager;

    public void add(Appointment appointment) {
        entityManager.persist(appointment);
    }

    public long futureCountFor(String patientId, Instant now) {
        return entityManager.createQuery(
                "select count(a) from Appointment a "
                    + "where a.patientId = :patient and a.startsAt > :now",
                Long.class)
            .setParameter("patient", patientId)
            .setParameter("now", now)
            .getSingleResult();
    }
}
