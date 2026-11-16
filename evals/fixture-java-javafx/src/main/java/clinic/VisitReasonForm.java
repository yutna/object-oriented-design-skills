package clinic;

import javafx.scene.Parent;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;

public class VisitReasonForm {
    private final TextArea text = new TextArea();
    private final CheckBox urgent = new CheckBox("Urgent");
    private final TextField phone = new TextField();
    private final Label message = new Label();
    private final Button save = new Button("Save");
    private final VBox root = new VBox(8, text, urgent, phone, save, message);

    public VisitReasonForm(String visitId, VisitReasons reasons) {
        phone.setPromptText("Contact phone");
        save.setOnAction(event -> {
            reasons.save(visitId, text.getText(), urgent.isSelected(), phone.getText());
            message.setText("Saved");
        });
    }

    public Parent root() {
        return root;
    }
}
