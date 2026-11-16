package clinic;

import java.awt.BorderLayout;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;

public class VisitWindow {
    private final JFrame frame = new JFrame("Visit");
    private final JLabel status = new JLabel(" ");
    private final Visit visit;
    private final PermitDesk permits;

    public VisitWindow(Visit visit, PermitDesk permits) {
        this.visit = visit;
        this.permits = permits;
        JPanel panel = new JPanel(new BorderLayout());
        panel.add(new JLabel(visit.patientName()), BorderLayout.NORTH);
        panel.add(status, BorderLayout.SOUTH);
        frame.add(panel);
        frame.pack();
    }

    public void show() {
        frame.setVisible(true);
    }
}
