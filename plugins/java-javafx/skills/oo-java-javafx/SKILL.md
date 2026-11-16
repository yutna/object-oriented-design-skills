---
name: oo-java-javafx
description: Use when JavaFX code binds controls to domain objects, decides where a view model's properties live, or changes the scene graph from a Task's thread.
license: MIT
metadata:
  version: 0.18.0
  pack: object-oriented-design-skills
---

# Designing Objects in JavaFX

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what JavaFX changes on top of `oo-java`: load that
skill too, because its rules on records, refusals and final classes
still hold in a JavaFX code base. JavaFX adds properties that a scene
watches, a toolkit that binds a view to them, and a rule that a showing
scene changes only on one thread. The toolkit makes three shortcuts
easy: a control bound straight to a domain object, a writable property
handed to a view, and a `Task` that writes the screen from its own
thread. This skill keeps the pack's rules where JavaFX makes them easy
to skip: a view model with screen-shaped properties, a domain value no
control binds to, a read-only property for what the view must not
change, a handler that only hands on intent, and one composition root
in the `Application` subclass.

## When to use

- A `CheckBox`, a `TextField` or another control is bound to a property
  of a domain object.
- A domain class carries a JavaFX property, such as a
  `BooleanProperty`, or imports a JavaFX property type.
- A screen's state or its logic lives in the view, or a test reaches it
  only by starting a `Stage`.
- A `Task` or another background thread changes a control, or a
  property a control shows.
- A handler checks a clinic rule, calls a store, or builds a domain
  object.
- A window builds its own store or view model with `new`.
- You are deciding where a view model's properties live, or whether a
  control may bind to a domain object.

## When not to use

- The code is plain Java with no user interface. `oo-java` covers it.
- The code is a Swing application: outside this skill.
- The question is one no JavaFX feature changes, such as which object
  owns a rule. The core skills answer it, starting from `oo-design`.

## Core rules

1. Rule. **Change a node of a showing scene only on the JavaFX
   Application Thread: run a slow use case in a `Task`'s `call`, which
   touches no node and no property a node is bound to, and apply its
   result in an `onSucceeded` handler or through `Platform.runLater`.**
   A node may be built and changed on any thread until it is attached to
   a scene in a window that is showing; from then on, a change to it, or
   to a property a control is bound to, belongs on the JavaFX
   Application Thread. A `Task`'s `call` runs on a background thread and
   returns a result; it does not write the screen. This keeps
   `oo-separating-presentation-from-domain` rule 6 and
   `oo-managing-shared-state` rules 2 and 3.

2. Default. **Give each screen a view model that holds the screen's
   state as JavaFX properties shaped for the screen and imports nothing
   from `javafx.scene`, so a test drives it with no stage; the view
   binds its controls to those properties.** This settles
   `oo-separating-presentation-from-domain` rule 3 for JavaFX, which
   binds: the view sets no state of its own, and a test builds the view
   model with a plain background seam and never builds a `Stage`. This
   keeps `oo-separating-presentation-from-domain` rules 2 and 3 and
   `oo-designing-for-testability` rule 1.

   The exception is a screen that shows a value and decides nothing,
   such as a line of fixed text: it needs no view model.

3. Rule. **Bind a control only to a property of a view model, never to
   a property of a domain object, and give a domain class no JavaFX
   property: the view model builds the domain value from what the user
   entered when the user acts, and the domain object refuses what its
   rules forbid.** A two-way binding between a control and a domain
   property writes the domain object as the user ticks, before any rule
   checks the value, and leaves a half-entered object that the store may
   save. The view model holds plain properties, turns them into a domain
   value in its save action, and lets that value's constructor refuse a
   forbidden combination. This keeps
   `oo-separating-presentation-from-domain` rule 5,
   `oo-encapsulating-state-and-behaviour` rules 1 and 2, and
   `oo-working-within-a-framework` rule 1.

4. Rule. **Hand the view a read-only property for every state the view
   must not change, from a `ReadOnly...Wrapper` the view model keeps for
   itself, and a writable property only where a control writes what the
   user enters.** A wrapper makes two synchronized properties: the
   read-only one is the one a view may keep, and the writable one stays
   inside the view model. The notice a view shows is read-only; the tick
   boxes the user sets are writable because a control writes them. This
   keeps `oo-separating-presentation-from-domain` rule 4 and
   `oo-encapsulating-state-and-behaviour` rule 5.

5. Rule. **Let a control's handler only pass the user's intent to the
   view model; the view model asks a use case, and no handler calls a
   store or decides a clinic rule.** A handler that checks a rule or
   calls a store holds a second copy of a rule the domain keeps, and a
   test reaches that copy only through the toolkit. The button's handler
   calls one method on the view model; the view model builds the domain
   value and asks the use case. This keeps
   `oo-separating-presentation-from-domain` rules 1 and 4.

6. Rule. **Make the view models, use cases and stores in one
   composition root reached from `Application.start`, and pass each
   collaborator through a constructor; the `Application` subclass that
   JavaFX requires is an edge class and holds no clinic rule.** JavaFX
   constructs the `Application` subclass and calls `start` on the
   JavaFX Application Thread, so `start` is where the object graph is
   built, before the stage shows. Each collaborator arrives through a
   constructor, and the subclass only creates the objects and sets the
   scene. This keeps `oo-inverting-dependencies` rules 2 and 3 and
   `oo-working-within-a-framework` rule 2.

## Pattern

`AccessNeedsForm` is the desk's form for a patient's access needs:
three tick boxes record whether the patient needs step-free access, a
hearing loop or an assistance dog, and a Save button records them. The
third tick box is labelled `Companion` and records the dog. The clinic's
rule is that a companion needs step-free access, because the room that
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
    private final BooleanProperty companion =
        new SimpleBooleanProperty();

    public BooleanProperty stepFreeProperty() {
        return stepFree;
    }

    public BooleanProperty hearingLoopProperty() {
        return hearingLoop;
    }

    public BooleanProperty companionProperty() {
        return companion;
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
    private final CheckBox companion = new CheckBox("Companion");
    private final Button save = new Button("Save");
    private final VBox root =
        new VBox(8, stepFree, hearingLoop, companion, save);
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
        companion.selectedProperty()
            .bindBidirectional(needs.companionProperty());
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
rule, so a tick can record an assistance dog without step-free access
(rule 3). The two-way bindings write the domain object as the user
ticks, before any rule checks it (rule 3), and the Save handler calls
the store itself (rule 5). No view model holds the screen's state
(rule 2). The fences store nothing themselves: they change the domain
object the form was given. They leave out what the store does with the
object, its transaction and its version, and they need no current time.

After:

`PatientAccessNeeds` is now a value with no JavaFX property: its compact
constructor refuses an assistance dog without step-free access.

```java
public record PatientAccessNeeds(
        boolean stepFree, boolean hearingLoop, boolean companion) {

    public PatientAccessNeeds {
        if (companion && !stepFree) {
            throw new IllegalArgumentException(
                "a companion needs step-free access");
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
    private final CheckBox companion = new CheckBox("Companion");
    private final Label notice = new Label();
    private final Button save = new Button("Save");
    private final VBox root =
        new VBox(8, stepFree, hearingLoop, companion, save, notice);

    public AccessNeedsForm(AccessNeedsViewModel viewModel) {
        stepFree.selectedProperty()
            .bindBidirectional(viewModel.stepFreeProperty());
        hearingLoop.selectedProperty()
            .bindBidirectional(viewModel.hearingLoopProperty());
        companion.selectedProperty()
            .bindBidirectional(viewModel.companionProperty());
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
only when the user saves, and its constructor refuses an assistance dog
without step-free access (rule 3). The form receives the view model
through its constructor and binds to it there; the view model never
holds the form. The composition root that builds the store, the use
case, the view model, the thread seam and the form in `Application.start`
is in [the thread reference](references/tasks-and-the-application-thread.md).

A save gives `RecordAccessNeeds` the patient's id and the new
`PatientAccessNeeds`; the store keeps one row per patient id, inside one
transaction. The fences leave the store, its transaction and its version
out, and no fence needs the current time.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A control bound to a property of a domain object, such as
  `CheckBox.selectedProperty()` bound to a domain `BooleanProperty`.
- A domain class that imports `javafx.beans.property`,
  `javafx.beans.value` or `javafx.scene`.
- A `Task`'s `call` that writes a `Label` or a property a control is
  bound to.
- A handler that checks a clinic rule, calls a store, or builds a domain
  object.
- A view that builds its view model with `new`.
- A `Task` kept in a field and started a second time.
- A `ReadOnlyStringWrapper` handed to a view instead of its read-only
  property.
- Screen logic that a test reaches only through `Platform.startup` or a
  `Stage`.

## Common mistakes

- Binding a control to a domain object's property because the form
  already holds the object.
- Calling `viewModel.save()` from a `Task`'s `call`, so the task writes
  the notice.
- Building the `Scene` in `Application.init`, which runs on the launcher
  thread, instead of in `start`.
- Reusing a `Task` for the next save after it has finished.
- Writing a setter on the domain value so the form can update it.
- Catching a domain refusal in the button's handler and showing its
  message there, instead of letting the view model answer.
- Putting a `Stage` or a `Scene` in the view model, so the view model
  imports `javafx.scene`.

## Related skills

- `oo-java` holds the language rules this skill applies.
- `oo-separating-presentation-from-domain` chooses how much the view
  knows and keeps the business out of it.
- `oo-designing-for-testability` keeps a screen's logic reachable
  without the toolkit.
- `oo-encapsulating-state-and-behaviour` keeps a domain value behind
  methods named for its actions.
- `oo-inverting-dependencies` decides how collaborators reach an object
  and where the composition root sits.
- `oo-managing-shared-state` confines changing state to one owner and
  hands a complete value to another thread.
- `oo-working-within-a-framework` decides how far to go along with what
  a framework demands.

## Further reading

- [Tasks and the thread](references/tasks-and-the-application-thread.md)
