# Tasks and the application thread

The access needs form saves through a store that takes a few seconds,
so the save runs in a `Task`. The task is the place where a JavaFX
program most easily writes a showing scene from the wrong thread: its
`call` runs on a background thread, and anything it changes that a
control shows changes off the JavaFX Application Thread. This reference
starts with a task whose `call` sets the notice a label shows, then
changes it so `call` returns the saved access needs and the view model
applies the result in the task's `onSucceeded` handler.

- [Before](#before)
- [After](#after)
- [The state it ends in](#the-state-it-ends-in)

## Before

The form is the Pattern's `AccessNeedsForm`: it binds its notice label
to `noticeProperty()` and its tick boxes to the three writable
properties. In the Before, `AccessNeedsViewModel` keeps the notice in a
`SimpleStringProperty` and hands that writable property to the view.
`SaveAccessNeeds` is a `Task<Void>` that receives the view model, the
use case, the patient id and the access needs through its constructor.

```java
import javafx.beans.property.BooleanProperty;
import javafx.beans.property.SimpleBooleanProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.property.StringProperty;

public final class AccessNeedsViewModel {
    private final String patientId;
    private final RecordAccessNeeds recorder;
    private final BooleanProperty stepFree = new SimpleBooleanProperty();
    private final BooleanProperty hearingLoop = new SimpleBooleanProperty();
    private final BooleanProperty companion =
        new SimpleBooleanProperty();
    private final StringProperty notice = new SimpleStringProperty("");

    public AccessNeedsViewModel(
            String patientId, RecordAccessNeeds recorder) {
        this.patientId = patientId;
        this.recorder = recorder;
    }

    public BooleanProperty stepFreeProperty() {
        return stepFree;
    }

    public BooleanProperty hearingLoopProperty() {
        return hearingLoop;
    }

    public BooleanProperty companionProperty() {
        return companion;
    }

    public StringProperty noticeProperty() {
        return notice;
    }

    public void save() {
        PatientAccessNeeds needs;
        try {
            needs = new PatientAccessNeeds(
                stepFree.get(), hearingLoop.get(), companion.get());
        } catch (IllegalArgumentException refused) {
            notice.set(refused.getMessage());
            return;
        }
        new Thread(
            new SaveAccessNeeds(this, recorder, patientId, needs)).start();
    }

    void showSaving() {
        notice.set("Saving");
    }

    void showSaved() {
        notice.set("Saved");
    }
}
```

`SaveAccessNeeds.call` runs on a background thread. It calls
`showSaving`, waits for the slow `RecordAccessNeeds.record`, and calls
`showSaved`; each call writes the property the form's label is bound to,
so a label of the showing scene changes off the JavaFX Application
Thread (rule 1).

```java
import javafx.concurrent.Task;

public final class SaveAccessNeeds extends Task<Void> {
    private final AccessNeedsViewModel viewModel;
    private final RecordAccessNeeds recorder;
    private final String patientId;
    private final PatientAccessNeeds needs;

    public SaveAccessNeeds(AccessNeedsViewModel viewModel,
            RecordAccessNeeds recorder, String patientId,
            PatientAccessNeeds needs) {
        this.viewModel = viewModel;
        this.recorder = recorder;
        this.patientId = patientId;
        this.needs = needs;
    }

    @Override
    protected Void call() {
        viewModel.showSaving();
        recorder.record(patientId, needs);
        viewModel.showSaved();
        return null;
    }
}
```

The task is built for one save, and a second press of the button builds
another. The store behind `RecordAccessNeeds` is slow; these fences
leave its code, its transaction and its version out, and neither needs
the current time. The view model is built with the patient id and the
use case, and the form is the Pattern's; the task is the only new class,
and the view model is the Before's version of the Pattern's.

## After

`AccessNeedsViewModel` in the After is the Pattern's view model, with
the same fields, constructor and properties. Its `save` builds the
domain value and hands the use case to `OffThreadWork`; the form, the
domain value, the store port and the use case are the Pattern's After.

```java
import javafx.beans.property.BooleanProperty;
import javafx.beans.property.ReadOnlyStringProperty;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.beans.property.SimpleBooleanProperty;

public final class AccessNeedsViewModel {
    private final String patientId;
    private final RecordAccessNeeds recorder;
    private final OffThreadWork offThread;
    private final BooleanProperty stepFree = new SimpleBooleanProperty();
    private final BooleanProperty hearingLoop = new SimpleBooleanProperty();
    private final BooleanProperty companion =
        new SimpleBooleanProperty();
    private final ReadOnlyStringWrapper notice =
        new ReadOnlyStringWrapper("");

    public AccessNeedsViewModel(String patientId, RecordAccessNeeds recorder,
            OffThreadWork offThread) {
        this.patientId = patientId;
        this.recorder = recorder;
        this.offThread = offThread;
    }

    public BooleanProperty stepFreeProperty() {
        return stepFree;
    }

    public BooleanProperty hearingLoopProperty() {
        return hearingLoop;
    }

    public BooleanProperty companionProperty() {
        return companion;
    }

    public ReadOnlyStringProperty noticeProperty() {
        return notice.getReadOnlyProperty();
    }

    public void save() {
        PatientAccessNeeds needs;
        try {
            needs = new PatientAccessNeeds(
                stepFree.get(), hearingLoop.get(), companion.get());
        } catch (IllegalArgumentException refused) {
            notice.set(refused.getMessage());
            return;
        }
        notice.set("Saving");
        offThread.run(
            () -> recorder.record(patientId, needs),
            saved -> notice.set("Saved"),
            failure -> notice.set(messageOf(failure)));
    }

    private String messageOf(Throwable failure) {
        String message = failure.getMessage();
        return message == null
            ? "the access needs could not be saved"
            : message;
    }
}
```

`OffThreadWork` is the seam between the view model and the thread; the
view model receives it through its constructor.

```java
import java.util.concurrent.Callable;
import java.util.function.Consumer;

public interface OffThreadWork {
    <T> void run(Callable<T> work, Consumer<T> done,
        Consumer<Throwable> failed);
}
```

`TaskBackground` implements the seam. Each `run` builds a new
`BackgroundTask` and a new `Thread`, sets `onSucceeded` to hand the
task's value to the done consumer, sets `onFailed` to hand the
exception to the failed consumer, and starts the thread. The task's
`call` only calls the work and returns its result, so it touches no
node and no property a node is bound to. The handlers run on the
JavaFX Application Thread, so the view model's `notice.set` in the done
consumer changes the label on the thread that owns it.

```java
import java.util.concurrent.Callable;
import java.util.function.Consumer;
import javafx.concurrent.Task;

public final class TaskBackground implements OffThreadWork {
    @Override
    public <T> void run(Callable<T> work, Consumer<T> done,
            Consumer<Throwable> failed) {
        BackgroundTask<T> task = new BackgroundTask<>(work);
        task.setOnSucceeded(event -> done.accept(task.getValue()));
        task.setOnFailed(event -> failed.accept(task.getException()));
        new Thread(task).start();
    }

    private static final class BackgroundTask<T> extends Task<T> {
        private final Callable<T> work;

        BackgroundTask(Callable<T> work) {
            this.work = work;
        }

        @Override
        protected T call() throws Exception {
            return work.call();
        }
    }
}
```

`ClinicDeskApp` is the composition root. `start` gives a store to a new
`RecordAccessNeeds`, then builds the view model, the task background and
the form with constructor calls, sets the scene and shows the stage
(rule 6).

```java
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

public final class ClinicDeskApp extends Application {
    @Override
    public void start(Stage stage) {
        AccessNeedsStore store = new PatientAccessNeedsTable();
        AccessNeedsViewModel viewModel = new AccessNeedsViewModel(
            "p-204", new RecordAccessNeeds(store), new TaskBackground());
        AccessNeedsForm form = new AccessNeedsForm(viewModel);
        stage.setTitle("Access needs");
        stage.setScene(new Scene(form.root()));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
```

Each save stores the access needs under the patient's id, inside one
transaction; the store, its transaction and its version are the
Pattern's and these fences leave them out. A new `Task` is made for each
save, because a task runs once.

## The state it ends in

The form saves through a `Task` whose `call` returns the recorded
access needs and touches nothing the scene shows; the view model applies
the result in the task's `onSucceeded` handler, on the JavaFX
Application Thread, and a new task is made for each save. That state
keeps rule 1: every change to a node of a showing scene, and to a
property a node is bound to, happens on the JavaFX Application Thread.
