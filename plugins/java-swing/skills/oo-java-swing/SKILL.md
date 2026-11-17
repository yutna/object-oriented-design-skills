---
name: oo-java-swing
description: Use when Java Swing code updates components off the event dispatch thread, decides rules inside listeners, or backs a JTable with domain objects.
license: MIT
metadata:
  version: 0.19.0
  pack: object-oriented-design-skills
---

# Designing Objects in Java Swing

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what Swing changes on top of `oo-java`: load that
skill too, because its rules on records, equality, refusals and final
classes still hold in a Swing code base. Swing adds one hard limit and
two quiet temptations. A component belongs to the event dispatch thread,
so a slow call made there freezes the window, and a component written
from another thread fails in ways a test rarely repeats. A `JTable`
invites its model to hand rows straight to domain objects, and a
listener invites a clinic rule to move into the window. This skill keeps
the pack's rules where Swing makes them easy to skip: work off the event
dispatch thread and back onto it, a passive view with a presenter, a
table model over values shaped for the screen, a held `JFrame`, and one
composition root on Java SE 25's `java.desktop`.

## When to use

- A component is written from a thread that did not create it, or a
  long call runs inside `actionPerformed`.
- An `ActionListener` or another listener checks a clinic rule, calls a
  store, or changes a domain object.
- A `JTable`'s `TableModel` returns domain objects or writes one.
- A window class extends `JFrame` or another Swing component.
- A window builds its own store or presenter, or reaches a clinic
  service through a static field.
- Screen logic can be reached only by starting a display.

## When not to use

- The code is plain Java with no user interface. `oo-java` covers it.
- The code is a JavaFX application: `oo-java-javafx` covers it.
- The question is one no Swing feature changes, such as which object
  owns a rule. The core skills answer it, starting from `oo-design`.

## Core rules

1. Rule. **Touch a Swing component only on the event dispatch thread:
   build and show each window from `SwingUtilities.invokeLater`, run a
   slow use case in a `SwingWorker`'s `doInBackground`, take the result
   into the presentation object and the components only in `done` or
   `process`, and never call `get` on the event dispatch thread before
   the work has finished.** A Swing component method that is not
   labelled thread safe must run on that thread, and a program that
   ignores this fails unpredictably. `done` runs on the event dispatch
   thread after `doInBackground` finishes, and `process` runs there with
   what `publish` sent; `get` called there blocks every event, repaints
   included, until the worker finishes. A worker is built for one
   execution. This keeps `oo-separating-presentation-from-domain` rule 6
   and `oo-managing-shared-state` rules 2 and 3.

2. Default. **Write a screen as a passive view: a view class that holds
   the components and offers methods named for what the screen shows,
   and a presenter with no `javax.swing` or `java.awt` import that holds
   the screen's state and its logic, so a test drives the presenter with
   a fake view and no display.** Swing binds nothing to a presenter on
   its own, so this settles `oo-separating-presentation-from-domain`
   rule 3 for Swing, and keeps
   `oo-separating-presentation-from-domain` rules 2 and 3 and
   `oo-designing-for-testability` rule 1.

   The exception is a screen that shows a value and decides nothing,
   such as a status line: it needs no presenter.

3. Rule. **Let a listener only pass the user's intent to the presenter:
   no `ActionListener` or other listener checks a clinic rule, calls a
   store or a use case, or changes a domain object.** A listener that
   does any of these holds a second copy of a rule the domain keeps, and
   a test reaches that copy only through the toolkit. This keeps
   `oo-separating-presentation-from-domain` rules 1 and 4.

4. Rule. **Back a `JTable` with a `TableModel` over the presenter's row
   values, shaped for the screen, never over domain objects; an editable
   cell's `setValueAt` hands the edit to the presenter as an intent
   instead of writing a field.** `JTable` asks the model whether a cell
   is editable and passes a changed cell's value to the model's
   `setValueAt`, so a model that holds a domain object lets the table
   change it past the rules its own methods keep. This keeps
   `oo-separating-presentation-from-domain` rule 5 and
   `oo-encapsulating-state-and-behaviour` rule 2.

5. Rule. **Build a window by holding a `JFrame` and adding components to
   it; extend a Swing component class only to change how it paints or
   lays itself out.** A subclass offers every public method of its
   parent and can stand wherever the parent is expected, so a window
   that extends `JFrame` to add fields and buttons states a kind-of
   relationship it does not have. This keeps
   `oo-choosing-composition-over-inheritance` rules 2 and 6.

6. Rule. **Make the windows, presenters, use cases and their stores in
   one composition root that `main` runs on the event dispatch thread,
   pass each collaborator through a constructor, and reach no clinic
   service through a static field.** The root names each object and what
   it needs before a window shows, so a constructor list says what a
   class depends on and a test supplies a stand-in. This keeps
   `oo-inverting-dependencies` rules 2 and 3.

## Pattern

`RunningLateWindow` is the front desk's running-late board: the desk
types a clinician's name and the minutes that clinician is running late,
and a table shows each clinician's expected wait. Reporting a delay is
one use case, and correcting a wait from the table is another. The
window carries what the desk typed and shows what the presenter tells
it; it decides nothing.

Before:

```java
import java.awt.BorderLayout;
import java.time.Duration;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;

public class RunningLateWindow extends JFrame {
    private final JTextField clinician = new JTextField(12);
    private final JTextField minutes = new JTextField(4);
    private final JButton report = new JButton("Report late");
    private final JLabel statusLine = new JLabel(" ");
    private final SlowLateReports reports = new SlowLateReports();

    public RunningLateWindow() {
        super("Running late");
        JPanel entry = new JPanel();
        entry.add(new JLabel("Clinician"));
        entry.add(clinician);
        entry.add(new JLabel("Minutes late"));
        entry.add(minutes);
        JPanel panel = new JPanel(new BorderLayout());
        panel.add(entry, BorderLayout.NORTH);
        panel.add(report, BorderLayout.CENTER);
        panel.add(statusLine, BorderLayout.SOUTH);
        add(panel);
        report.addActionListener(event -> {
            int late = Integer.parseInt(minutes.getText());
            if (late < 0 || late > 120) {
                statusLine.setText("a delay runs from 0 to 120 minutes");
                return;
            }
            reports.record(clinician.getText(), Duration.ofMinutes(late));
            statusLine.setText(clinician.getText() + " is " + late
                + " minutes late");
        });
        setSize(420, 160);
        setVisible(true);
    }

    public static void main(String[] args) {
        new RunningLateWindow();
    }
}

final class SlowLateReports {
    void record(String clinician, Duration late) {
        try {
            Thread.sleep(2_000);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
        }
        System.out.println(clinician + " " + late.toMinutes());
    }
}
```

In the Before, `RunningLateWindow` extends `JFrame` (rule 5), builds and
shows itself from `main` and from its constructor on the thread that
started the program (rule 1), and its `ActionListener` checks the
delay's range, calls the two-second `SlowLateReports.record` on the
event dispatch thread, and sets the label itself (rules 1 and 3). The
listener parses the minutes with `Integer.parseInt`, so a blank field
throws inside the event dispatch thread. The fence holds no domain
object: the range check is a condition in the listener, no guarded state
has a writer, and the fence needs no current time. It leaves out what
refuses a second report that passes the same check at the same moment: a
store that keeps one row per clinician, with a unique key on the
clinician, refuses it. `SlowLateReports` prints the report, and the
fence leaves out where a store would keep it and in which transaction.

After:

```java
import java.util.List;
import java.util.function.BiConsumer;

public interface LateBoardView {
    void addReportListener(BiConsumer<String, String> listener);

    void addWaitEditListener(BiConsumer<LateRow, String> listener);

    void showRows(List<LateRow> rows);

    void showProblem(String message);
}
```

`LateBoardView` is the window as the presenter knows it: two methods
that register a listener for the desk's report and for an edited wait,
and two that show the rows and a problem. A Swing button takes its
`ActionListener` the same way `addReportListener` adds one, whereas
`addWaitEditListener` builds the table model around its listener, so a
second call replaces the first; the interface imports nothing from
Swing.

```java
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public final class LateBoardPresenter {
    private final LateBoardView view;
    private final MaintainLateBoard maintainLateBoard;
    private final BackgroundWork background;
    private List<LateRow> rows = List.of();

    public LateBoardPresenter(LateBoardView view,
            MaintainLateBoard maintainLateBoard,
            BackgroundWork background) {
        this.view = view;
        this.maintainLateBoard = maintainLateBoard;
        this.background = background;
        view.addReportListener(this::report);
        view.addWaitEditListener(this::waitEdited);
    }

    public void report(String clinician, String minutes) {
        Duration wait = waitOf(minutes);
        if (wait == null) {
            return;
        }
        background.run(
            () -> maintainLateBoard.report(clinician, wait),
            this::showRows,
            this::showFailure);
    }

    public void waitEdited(LateRow row, String minutes) {
        Duration wait = waitOf(minutes);
        if (wait == null) {
            return;
        }
        background.run(
            () -> maintainLateBoard.correct(row.clinician(), wait),
            this::showRows,
            this::showFailure);
    }

    private Duration waitOf(String text) {
        try {
            return Duration.ofMinutes(Long.parseLong(text.strip()));
        } catch (NumberFormatException error) {
            view.showProblem("a wait is a whole number of minutes");
            return null;
        }
    }

    private void showRows(List<RunningLateReport> reports) {
        List<LateRow> shown = new ArrayList<>();
        for (RunningLateReport report : reports) {
            shown.add(new LateRow(
                report.clinician(),
                report.expectedWait().toMinutes() + " min"));
        }
        rows = List.copyOf(shown);
        view.showRows(rows);
    }

    private void showFailure(Throwable error) {
        String message = error.getMessage();
        view.showProblem(message == null
            ? "the board could not be updated"
            : message);
    }
}
```

`LateBoardPresenter` holds the screen's state in `rows` and its logic in
`report` and `waitEdited`, and its constructor registers both methods
with the view, so nothing of the presenter reaches the window after it
is built. It imports no `javax.swing` or `java.awt` type, so a test
builds it with a fake view and a `BackgroundWork` that runs the work and
its callbacks at once, then reads what the view was told (rule 2). A
change that follows the slow work happens when the worker's `done`
callback calls the presenter's `showRows` or `showFailure`, and the
presenter then tells the view, never from the listener itself. It stores
the rows it shows and changes no domain state.

```java
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.function.Consumer;
import javax.swing.SwingWorker;

public final class SwingBackground implements BackgroundWork {
    @Override
    public <T> void run(Callable<T> work, Consumer<T> done,
            Consumer<Throwable> failed) {
        new SwingWorker<T, Object>() {
            @Override
            protected T doInBackground() throws Exception {
                return work.call();
            }

            @Override
            protected void done() {
                try {
                    done.accept(get());
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    failed.accept(error);
                } catch (ExecutionException error) {
                    failed.accept(error.getCause());
                }
            }
        }.execute();
    }
}
```

`SwingBackground` implements `BackgroundWork`, the seam between the
presenter and the thread: its `run` takes the work, what to do with the
result, and what to do with a failure, so a test implements it
synchronously. `SwingBackground` runs `work` in `doInBackground`, which
runs on a background thread, and calls `done` on the event dispatch
thread after the work finishes. `get` there reads a result that is
already complete, so it blocks nothing (rule 1). It builds one worker
for one call, because a `SwingWorker` is built to be executed once. The
fence stores nothing.

```java
import java.awt.BorderLayout;
import java.util.List;
import java.util.function.BiConsumer;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;

public final class RunningLateWindow implements LateBoardView {
    private final JFrame frame = new JFrame("Running late");
    private final JTextField clinician = new JTextField(12);
    private final JTextField minutes = new JTextField(4);
    private final JButton report = new JButton("Report late");
    private final JLabel statusLine = new JLabel(" ");
    private final JTable waits = new JTable();
    private LateBoardTableModel model;

    public RunningLateWindow() {
        JPanel entry = new JPanel();
        entry.add(new JLabel("Clinician"));
        entry.add(clinician);
        entry.add(new JLabel("Minutes late"));
        entry.add(minutes);
        JPanel south = new JPanel(new BorderLayout());
        south.add(report, BorderLayout.NORTH);
        south.add(statusLine, BorderLayout.SOUTH);
        JPanel panel = new JPanel(new BorderLayout());
        panel.add(entry, BorderLayout.NORTH);
        panel.add(new JScrollPane(waits), BorderLayout.CENTER);
        panel.add(south, BorderLayout.SOUTH);
        frame.add(panel);
        frame.pack();
    }

    @Override
    public void addReportListener(BiConsumer<String, String> listener) {
        report.addActionListener(event -> listener.accept(
            clinician.getText(), minutes.getText()));
    }

    @Override
    public void addWaitEditListener(BiConsumer<LateRow, String> listener) {
        model = new LateBoardTableModel(listener);
        waits.setModel(model);
    }

    @Override
    public void showRows(List<LateRow> rows) {
        model.showRows(rows);
    }

    @Override
    public void showProblem(String message) {
        statusLine.setText(message);
    }

    public void show() {
        frame.setVisible(true);
    }
}
```

`RunningLateWindow` holds a `JFrame` and adds its panel to it instead of
extending it (rule 5). Its `ActionListener` reads the two fields and
hands them to the report listener it was given, and it decides nothing
(rule 3). Every component change arrives through `showRows` or
`showProblem`. The presenter registers both listeners in its
constructor, before the window is shown, and `addWaitEditListener`
builds the table model over the presenter's row values, so a cell edit
reaches the presenter and the window holds no presenter of its own.

`MaintainLateBoard` is the use case the presenter asks; it is shown in
[the table model reference](references/table-models-over-row-values.md),
where `correct` answers an edit. `report` asks its `Clock` once and
stamps the new report. Both methods store through `LateReports` under
the clinician's name; the store, its transaction and the version on its
row are left out of this skill.

```java
import java.time.Clock;
import javax.swing.SwingUtilities;

public final class ClinicDesk {
    private ClinicDesk() {
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(ClinicDesk::start);
    }

    private static void start() {
        LateReports reports = new DatabaseLateReports();
        MaintainLateBoard maintainLateBoard =
            new MaintainLateBoard(Clock.systemUTC(), reports);
        RunningLateWindow window = new RunningLateWindow();
        new LateBoardPresenter(window, maintainLateBoard,
            new SwingBackground());
        window.show();
    }
}
```

`ClinicDesk` is the composition root: `main` hands `start` to
`SwingUtilities.invokeLater`, so the window is built and shown on the
event dispatch thread (rule 1), and `start` builds the store adapter,
the use case, the window, the presenter and the background worker with
constructor calls in the order they need one another (rule 6). Each
collaborator arrives through a constructor: the presenter receives the
window there and registers its two methods with it in its own
constructor, as a Swing button takes its listeners, so the window gets
no presenter after it is built. No clinic service sits in a static
field (rule 6). The fence leaves out where the store keeps its rows.

`LateRow` is one row shaped for the screen, and `LateBoardTableModel` is
the table's model over those rows. Both are shown in
[the table model reference](references/table-models-over-row-values.md).

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A label or table written from a thread that is not the event dispatch
  thread.
- A `SwingWorker` whose `get` is called on the event dispatch thread
  before the work finishes.
- An `ActionListener` that checks a clinic rule, calls a store, or
  changes a domain object.
- A `TableModel` that returns a domain object or writes one in
  `setValueAt`.
- A window class that extends `JFrame` or another Swing component.
- A window that builds its store or presenter with `new`.
- Screen logic reachable only by starting a display.

## Common mistakes

- Calling `get` on a `SwingWorker` in the listener to wait for the
  result.
- Starting a slow call in `actionPerformed` and repainting when it
  returns.
- Putting a `JOptionPane` call in the presenter, which then imports
  Swing.
- Building the window in `main` on the main thread instead of inside
  `invokeLater`.
- Binding the table model to the domain reports because they are
  already loaded.
- Writing a setter on the domain object so the table can edit it.
- Reusing one `SwingWorker` for a second press of the button.

## Related skills

- `oo-java` holds the language rules this skill applies.
- `oo-java-javafx` covers a JavaFX application, from view models with
  screen-shaped properties to the scene graph.
- `oo-separating-presentation-from-domain` chooses how much the view
  knows and keeps the business out of it.
- `oo-designing-for-testability` keeps a screen's logic reachable
  without the toolkit.
- `oo-encapsulating-state-and-behaviour` keeps a domain value behind
  methods named for its actions.
- `oo-choosing-composition-over-inheritance` decides between holding a
  class and extending it.
- `oo-inverting-dependencies` decides how collaborators reach an object
  and where the composition root sits.
- `oo-managing-shared-state` confines changing state to one owner and
  hands a complete object to another thread.

## Further reading

- [Table models over row values](references/table-models-over-row-values.md)
