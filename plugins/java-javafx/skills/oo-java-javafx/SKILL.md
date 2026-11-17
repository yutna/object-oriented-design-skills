---
name: oo-java-javafx
description: Use when JavaFX code binds controls to domain objects, decides where a view model's properties live, or changes the scene graph from a Task's thread.
license: MIT
metadata:
  version: 0.21.0
  pack: object-oriented-design-skills
---

# Designing Objects in JavaFX

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

JavaFX adds three things to `oo-java` that change how a clinic's rules
are kept: properties a control can observe and bind, a view model a
toolkit can drive, and a `Task` that runs work on a background thread.
This skill covers only those changes; load `oo-java` too, because its
rules for records, refusals and final classes still hold. Each change
brings a shortcut that looks harmless: a control bound straight to a
domain object, a writable property handed to a view, and a `Task` that
writes the screen from its own thread. The rules below close those
shortcuts with a view model whose properties are shaped for the screen,
a domain value no control binds to, a read-only property for state the
view only shows, a handler that hands on intent, and one composition
root in the `Application` subclass.

## When to use

- A `CheckBox`, a `TextField` or another control is bound to a domain
  object's property.
- A domain class carries a JavaFX property, such as a
  `BooleanProperty`, or imports a JavaFX property type.
- Screen state or screen logic lives in the view, or a test needs a
  `Stage` to reach it.
- A `Task` or another background thread writes a control, or a property
  a control shows.
- A handler decides a clinic rule, reaches a store, or constructs a
  domain object.
- A window creates its own store or view model with `new`.
- You are choosing where a view model's properties live, or whether a
  control may bind to a domain object.

## When not to use

- There is no user interface, so `oo-java` alone answers the question.
- The application is built with Swing: `oo-java-swing` covers it.
- No JavaFX feature bears on the question, such as where a rule
  belongs; start with the core skills, at `oo-design`.

## Core rules

1. Rule. **Keep every change to a showing scene on the JavaFX
   Application Thread: a slow use case runs in a `Task`'s `call`, which
   touches no node and no property a node is bound to, and its result
   reaches the scene from an `onSucceeded` handler or a
   `Platform.runLater` call.** A node may be built and changed on any
   thread until it is attached to a scene in a window that is showing;
   from then on, a change to it, or to a property a control is bound to,
   belongs on the JavaFX Application Thread. A `Task`'s `call` runs on a
   background thread and returns a result; it does not write the screen.
   This keeps
   `oo-separating-presentation-from-domain` rule 6 and
   `oo-managing-shared-state` rules 2 and 3.

2. Default. **Give each screen a view model whose JavaFX properties
   hold the screen's state in the shape the screen needs; it imports
   nothing from `javafx.scene`, so a test drives it with no stage, and
   the view binds its controls to those properties.** This settles
   `oo-separating-presentation-from-domain` rule 3 for JavaFX, which
   binds: the view sets no state of its own, and a test builds the view
   model with a plain background seam and never builds a `Stage`. This
   keeps `oo-separating-presentation-from-domain` rules 2 and 3 and
   `oo-designing-for-testability` rule 1.

   The exception is a screen with no decision to make, such as a line of
   fixed text: it needs no view model.

3. Rule. **Bind a control only to a view model's property, never to a
   domain object's property, and leave a domain class with no JavaFX
   property: when the user acts, the view model builds the domain value
   from what the user entered, and the domain object refuses what its
   rules forbid.** A two-way binding between a control and a domain
   property writes the domain object as the user ticks, before any rule
   checks the value, and leaves a half-entered object that the store may
   save. The view model holds plain properties, turns them into a domain
   value in its save action, and lets that value's constructor refuse a
   forbidden combination. This keeps
   `oo-separating-presentation-from-domain` rule 5,
   `oo-encapsulating-state-and-behaviour` rules 1 and 2, and
   `oo-working-within-a-framework` rule 1.

4. Rule. **Give the view a read-only property for every state it must
   not change, from a `ReadOnly...Wrapper` the view model keeps for
   itself; hand out a writable property only where a control writes what
   the user enters.** A wrapper makes two synchronized properties: the
   read-only one is the one a view may keep, and the writable one stays
   inside the view model. The notice a view shows is read-only; the tick
   boxes the user sets are writable because a control writes them. This
   keeps `oo-separating-presentation-from-domain` rule 4 and
   `oo-encapsulating-state-and-behaviour` rule 5.

5. Rule. **Let a control's handler do no more than pass the user's
   intent to the view model; the view model asks a use case, and no
   handler calls a store or decides a clinic rule.** A handler that
   checks a rule or calls a store keeps its own copy of a decision the
   domain owns, and only a test that starts the toolkit can reach that
   copy. The button's handler calls one method on the view model; the
   view model builds the domain value and asks the use case. This keeps
   `oo-separating-presentation-from-domain` rules 1 and 4.

6. Rule. **Build the view models, use cases and stores in one
   composition root that `Application.start` reaches, and pass every
   collaborator through a constructor; the `Application` subclass JavaFX
   requires is an edge class that holds no clinic rule.** JavaFX
   constructs the `Application` subclass and calls `start` on the
   JavaFX Application Thread, so `start` is where the object graph is
   built, before the stage shows. Each collaborator arrives through a
   constructor, and the subclass only creates the objects and sets the
   scene. This keeps `oo-inverting-dependencies` rules 2 and 3 and
   `oo-working-within-a-framework` rule 2.

## Pattern

`AccessNeedsForm` is the desk's form for a patient's access needs:
three tick boxes record whether the patient needs step-free access, a
hearing loop or a canine, and a Save button records them. The
third tick box is labelled `Canine` and records the canine. The clinic's
rule is that a canine needs step-free access, because the room that
takes one is reached by the step-free route. The form shows what the
desk ticked and hands the save to a view model; the view model builds
the patient's access needs and asks a use case.

Before:

```java
import javafx.beans.property.BooleanProperty;
import javafx.beans.property.SimpleBooleanProperty;

public final class PatientAccessNeeds {
    private final BooleanProperty stepFree = new SimpleBooleanProperty();
    private final BooleanProperty hearingLoop = new SimpleBooleanProperty();
    private final BooleanProperty canine =
        new SimpleBooleanProperty();

    public BooleanProperty stepFreeProperty() {
        return stepFree;
    }

    public BooleanProperty hearingLoopProperty() {
        return hearingLoop;
    }

    public BooleanProperty canineProperty() {
        return canine;
    }
}
```

`PatientAccessNeeds` is the domain class in the Before: three JavaFX
properties and no rule. `AccessNeedsForm` binds each `CheckBox`'s
`selectedProperty` to one of those properties with `bindBidirectional`,
so a tick writes the domain object, and its Save handler calls
`AccessNeedsStore.save` with that object.

```java
import javafx.scene.Parent;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.layout.VBox;

public final class AccessNeedsForm {
    private final CheckBox stepFree = new CheckBox("Step-free access");
    private final CheckBox hearingLoop = new CheckBox("Hearing loop");
    private final CheckBox canine = new CheckBox("Canine");
    private final Button save = new Button("Save");
    private final VBox root =
        new VBox(8, stepFree, hearingLoop, canine, save);
    private final PatientAccessNeeds needs;
    private final AccessNeedsStore store;

    public AccessNeedsForm(
            PatientAccessNeeds needs, AccessNeedsStore store) {
        this.needs = needs;
        this.store = store;
        stepFree.selectedProperty()
            .bindBidirectional(needs.stepFreeProperty());
        hearingLoop.selectedProperty()
            .bindBidirectional(needs.hearingLoopProperty());
        canine.selectedProperty()
            .bindBidirectional(needs.canineProperty());
        save.setOnAction(event -> store.save("p-204", needs));
    }

    public Parent root() {
        return root;
    }
}
```

`AccessNeedsStore` is the port the form calls; its adapter is outside
this fence.

```java
public interface AccessNeedsStore {
    PatientAccessNeeds save(String patientId, PatientAccessNeeds needs);
}
```

In the Before, `PatientAccessNeeds` carries JavaFX properties and no
rule, so a tick can record a canine without step-free access
(rule 3). The two-way bindings write the domain object as the user
ticks, before any rule checks it (rule 3), and the Save handler calls
the store itself (rule 5). No view model holds the screen's state
(rule 2). The fences store nothing themselves: they change the domain
object the form was given. They leave out what the store does with the
object, its transaction and its version, and they need no current time.

After:

`PatientAccessNeeds` is now a value with no JavaFX property: its compact
constructor refuses a canine without step-free access.

```java
public record PatientAccessNeeds(
        boolean stepFree, boolean hearingLoop, boolean canine) {

    public PatientAccessNeeds {
        if (canine && !stepFree) {
            throw new IllegalArgumentException(
                "a canine needs step-free access");
        }
    }
}
```

`RecordAccessNeeds` is the use case the view model asks; it calls the
same `AccessNeedsStore` port and answers the access needs the store
recorded.

```java
public final class RecordAccessNeeds {
    private final AccessNeedsStore store;

    public RecordAccessNeeds(AccessNeedsStore store) {
        this.store = store;
    }

    public PatientAccessNeeds record(
            String patientId, PatientAccessNeeds needs) {
        return store.save(patientId, needs);
    }
}
```

`OffThreadWork` is the seam between the view model and the thread; a
test implements it synchronously, so the view model needs no stage.

```java
import java.util.concurrent.Callable;
import java.util.function.Consumer;

public interface OffThreadWork {
    <T> void run(Callable<T> work, Consumer<T> done,
        Consumer<Throwable> failed);
}
```

`AccessNeedsViewModel` holds the screen's state. The three entry
properties are writable because the form's controls write them, and the
notice is a `ReadOnlyStringWrapper` the view model keeps for itself.

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
    private final BooleanProperty canine =
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

    public BooleanProperty canineProperty() {
        return canine;
    }

    public ReadOnlyStringProperty noticeProperty() {
        return notice.getReadOnlyProperty();
    }

    public void save() {
        PatientAccessNeeds needs;
        try {
            needs = new PatientAccessNeeds(
                stepFree.get(), hearingLoop.get(), canine.get());
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

`AccessNeedsForm` receives the view model through its constructor and
binds to it there: each `CheckBox` writes its writable property, the
label reads the read-only notice, and the handler calls only `save`.

```java
import javafx.scene.Parent;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;

public final class AccessNeedsForm {
    private final CheckBox stepFree = new CheckBox("Step-free access");
    private final CheckBox hearingLoop = new CheckBox("Hearing loop");
    private final CheckBox canine = new CheckBox("Canine");
    private final Label notice = new Label();
    private final Button save = new Button("Save");
    private final VBox root =
        new VBox(8, stepFree, hearingLoop, canine, save, notice);

    public AccessNeedsForm(AccessNeedsViewModel viewModel) {
        stepFree.selectedProperty()
            .bindBidirectional(viewModel.stepFreeProperty());
        hearingLoop.selectedProperty()
            .bindBidirectional(viewModel.hearingLoopProperty());
        canine.selectedProperty()
            .bindBidirectional(viewModel.canineProperty());
        notice.textProperty().bind(viewModel.noticeProperty());
        save.setOnAction(event -> viewModel.save());
    }

    public Parent root() {
        return root;
    }
}
```

In the After, `AccessNeedsViewModel` holds the screen's state and its
logic, and it imports no `javafx.scene` type, so a test builds it with a
synchronous `OffThreadWork` and no `Stage` (rule 2). The form binds each
`CheckBox` to a writable property of the view model and the label to its
read-only notice, and its handler only calls `viewModel.save()` (rules
3, 4 and 5). `PatientAccessNeeds` has no JavaFX property: it is built
only when the user saves, and its constructor refuses a canine
without step-free access (rule 3). The form receives the view model
through its constructor and binds to it there; the view model never
holds the form. The composition root that builds the store, the use
case, the view model, the thread seam and the form in `Application.start`
is in [the thread reference](references/tasks-and-the-application-thread.md).

A save gives `RecordAccessNeeds` the patient's id and the new
`PatientAccessNeeds`; the store keeps one row per patient id, inside one
transaction. A second save for the same patient at the same moment is
refused by the store's key on the patient id, which the fence leaves
out. The fences leave the store, its transaction and its version out,
and no fence needs the current time.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A control bound to a property of a domain object, such as
  `CheckBox.selectedProperty()` bound to a domain `BooleanProperty`.
- A domain class that imports `javafx.beans.property`,
  `javafx.beans.value` or `javafx.scene`.
- A `Task`'s `call` that writes a `Label` or a property a control is
  bound to.
- A handler that decides a clinic rule, reaches a store, or constructs a
  domain object.
- A view that creates its view model with `new`.
- A `Task` kept in a field and started a second time.
- A `ReadOnlyStringWrapper` handed to a view instead of its read-only
  property.
- Screen logic that a test can reach only through `Platform.startup` or
  a `Stage`.

## Common mistakes

- Binding a control to a domain object's property because the form
  already holds the object.
- Calling `viewModel.save()` from a `Task`'s `call`, so the task writes
  the notice.
- Building the `Scene` in `Application.init`, which runs on the launcher
  thread, instead of in `start`.
- Reusing a `Task` for the next save after it has finished.
- Adding a setter to the domain value so the form can write a tick back
  into it.
- Catching a domain refusal in the button's handler and showing its
  message there, instead of letting the view model answer.
- Putting a `Stage` or a `Scene` in the view model, so the view model
  imports `javafx.scene`.

## Related skills

- `oo-java` supplies the Java language rules this skill builds on.
- `oo-java-swing` covers a Swing application: the event dispatch
  thread, and domain objects behind a table.
- `oo-separating-presentation-from-domain` weighs what a view knows and
  keeps clinic rules behind a use case.
- `oo-designing-for-testability` makes a screen's logic reachable with
  plain objects and no toolkit.
- `oo-encapsulating-state-and-behaviour` keeps a value's rules inside
  its own methods.
- `oo-inverting-dependencies` chooses how collaborators arrive and where
  the object graph is built.
- `oo-managing-shared-state` gives changing state one owner and moves
  only complete values between threads.
- `oo-working-within-a-framework` judges how much of a framework's shape
  to follow.

## Further reading

- [Tasks and the thread](references/tasks-and-the-application-thread.md)
