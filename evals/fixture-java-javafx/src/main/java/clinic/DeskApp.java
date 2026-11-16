package clinic;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class DeskApp extends Application {
    @Override
    public void start(Stage stage) {
        VisitReasons reasons = (visitId, text, urgent, phone) ->
            System.out.println("reason for " + visitId + ": " + text);
        VisitReasonForm form = new VisitReasonForm("v-31", reasons);
        stage.setScene(new Scene(form.root()));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
