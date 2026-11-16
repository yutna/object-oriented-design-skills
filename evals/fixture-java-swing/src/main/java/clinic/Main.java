package clinic;

import java.time.Duration;
import javax.swing.SwingUtilities;

public final class Main {
    public static void main(String[] args) {
        PermitDesk permits = visitId -> System.out.println("permit for " + visitId);
        Visit visit = new Visit("v-17", "Ana Ruiz", Duration.ofMinutes(120));
        SwingUtilities.invokeLater(() -> new VisitWindow(visit, permits).show());
    }
}
