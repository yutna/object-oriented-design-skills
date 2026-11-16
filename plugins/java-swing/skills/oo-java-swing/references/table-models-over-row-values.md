# Table models over row values

The running-late board's table is where a `JTable` meets the clinic's
books. The model it reads decides whether the table sees values shaped
for the screen or the domain objects themselves, and where an edited
cell goes. This reference changes the board's model from one over
domain objects to one over row values, and the edited wait from a field
written in the object to an intent handed to the presenter.

- [Before](#before)
- [After](#after)
- [The state it ends in](#the-state-it-ends-in)

## Before

`RunningLateReport` is the board's domain value: a clinician, the
expected wait, and when the desk reported it. `LateBoardTableModel` is
the model the board's `JTable` reads.

```java
import java.time.Duration;
import java.time.Instant;

public final class RunningLateReport {
    private final String clinician;
    private Duration expectedWait;
    private final Instant reportedAt;

    public RunningLateReport(
            String clinician, Duration expectedWait, Instant reportedAt) {
        this.clinician = clinician;
        this.expectedWait = expectedWait;
        this.reportedAt = reportedAt;
    }

    public void setExpectedWait(Duration expectedWait) {
        this.expectedWait = expectedWait;
    }

    public String clinician() {
        return clinician;
    }

    public Duration expectedWait() {
        return expectedWait;
    }

    public Instant reportedAt() {
        return reportedAt;
    }
}
```

```java
import java.time.Duration;
import java.util.List;
import javax.swing.table.AbstractTableModel;

public final class LateBoardTableModel extends AbstractTableModel {
    private final List<RunningLateReport> reports;

    public LateBoardTableModel(List<RunningLateReport> reports) {
        this.reports = reports;
    }

    @Override
    public int getRowCount() {
        return reports.size();
    }

    @Override
    public int getColumnCount() {
        return 2;
    }

    @Override
    public String getColumnName(int column) {
        return column == 0 ? "Clinician" : "Expected wait";
    }

    @Override
    public boolean isCellEditable(int row, int column) {
        return column == 1;
    }

    @Override
    public Object getValueAt(int row, int column) {
        RunningLateReport report = reports.get(row);
        return column == 0
            ? report.clinician()
            : report.expectedWait().toMinutes() + " min";
    }

    @Override
    public void setValueAt(Object value, int row, int column) {
        reports.get(row).setExpectedWait(
            Duration.ofMinutes(Long.parseLong(String.valueOf(value))));
        fireTableCellUpdated(row, column);
    }
}
```

In the Before, `RunningLateReport` keeps a public `setExpectedWait` and
checks nothing, so the model that holds it can set a wait the clinic
does not allow. `LateBoardTableModel` holds the domain objects
themselves, and its `setValueAt` writes the edited wait into the object
with that setter (rule 4). The model reads each cell out of the domain
object, so the table depends on how the report stores its fields, and
nothing behind the model decides whether the edit may happen: the value
is written before any rule is asked. The fence stores nothing of its
own; it changes the objects the table handed it. It leaves out what
refuses a second edit at the same moment, because it checks nothing
before it writes; a version column on the stored report would refuse a
save made from a copy that has moved on. The fence needs no current
time and holds no guarded state: the setter is the only writer, and
nothing checks it.

## After

`LateRow` is one row shaped for the screen: the clinician's name and the
wait as text the table shows.

```java
public record LateRow(String clinician, String expectedWait) {
}
```

`RunningLateReport` now checks its rules in its constructor, keeps every
field final, and offers `withExpectedWait` in place of the setter: a new
value is a new report, and no public writer changes this one.

```java
import java.time.Duration;
import java.time.Instant;

public final class RunningLateReport {
    private static final Duration LONGEST = Duration.ofMinutes(120);
    private final String clinician;
    private final Duration expectedWait;
    private final Instant reportedAt;

    public RunningLateReport(
            String clinician, Duration expectedWait, Instant reportedAt) {
        if (clinician == null || clinician.isBlank()) {
            throw new IllegalArgumentException("no clinician is named");
        }
        if (expectedWait == null || expectedWait.isNegative()
                || expectedWait.compareTo(LONGEST) > 0) {
            throw new IllegalArgumentException(
                "a wait runs from 0 to 120 minutes");
        }
        this.clinician = clinician;
        this.expectedWait = expectedWait;
        this.reportedAt = reportedAt;
    }

    public RunningLateReport withExpectedWait(Duration newWait) {
        return new RunningLateReport(clinician, newWait, reportedAt);
    }

    public String clinician() {
        return clinician;
    }

    public Duration expectedWait() {
        return expectedWait;
    }

    public Instant reportedAt() {
        return reportedAt;
    }
}
```

`LateBoardTableModel` holds the presenter's row values and the edit
listener the window built it with, and its `setValueAt` hands the edited
row and text to that listener as an intent.

```java
import java.util.List;
import java.util.function.BiConsumer;
import javax.swing.table.AbstractTableModel;

public final class LateBoardTableModel extends AbstractTableModel {
    private final BiConsumer<LateRow, String> edit;
    private List<LateRow> rows = List.of();

    public LateBoardTableModel(BiConsumer<LateRow, String> edit) {
        this.edit = edit;
    }

    @Override
    public int getRowCount() {
        return rows.size();
    }

    @Override
    public int getColumnCount() {
        return 2;
    }

    @Override
    public String getColumnName(int column) {
        return column == 0 ? "Clinician" : "Expected wait";
    }

    @Override
    public boolean isCellEditable(int row, int column) {
        return column == 1;
    }

    @Override
    public Object getValueAt(int row, int column) {
        LateRow item = rows.get(row);
        return column == 0 ? item.clinician() : item.expectedWait();
    }

    @Override
    public void setValueAt(Object value, int row, int column) {
        edit.accept(rows.get(row), String.valueOf(value));
    }

    public void showRows(List<LateRow> rows) {
        this.rows = List.copyOf(rows);
        fireTableDataChanged();
    }
}
```

`LateBoardPresenter` keeps the rows the screen shows and turns an edit
into the use case, run through `BackgroundWork`; its constructor
registers `report` and `waitEdited` with the view, and the view is told
the new rows in the worker's `done` callback, on the event dispatch
thread.

```java
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public final class LateBoardPresenter {
    private final LateBoardView view;
    private final MaintainLateBoard board;
    private final BackgroundWork background;
    private List<LateRow> rows = List.of();

    public LateBoardPresenter(LateBoardView view, MaintainLateBoard board,
            BackgroundWork background) {
        this.view = view;
        this.board = board;
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
            () -> board.report(clinician, wait),
            this::showRows,
            this::showFailure);
    }

    public void waitEdited(LateRow row, String minutes) {
        Duration wait = waitOf(minutes);
        if (wait == null) {
            return;
        }
        background.run(
            () -> board.correct(row.clinician(), wait),
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

`MaintainLateBoard` loads the report for the clinician, asks it for the
new wait, and saves the report it answers.

```java
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

public final class MaintainLateBoard {
    private final Clock clock;
    private final LateReports reports;

    public MaintainLateBoard(Clock clock, LateReports reports) {
        this.clock = clock;
        this.reports = reports;
    }

    public List<RunningLateReport> report(String clinician, Duration wait) {
        Instant now = clock.instant();
        reports.save(new RunningLateReport(clinician, wait, now));
        return reports.all();
    }

    public List<RunningLateReport> correct(
            String clinician, Duration wait) {
        RunningLateReport found = null;
        for (RunningLateReport report : reports.all()) {
            if (report.clinician().equals(clinician)) {
                found = report;
            }
        }
        if (found == null) {
            throw new IllegalArgumentException(
                "nobody is on the board as " + clinician);
        }
        reports.save(found.withExpectedWait(wait));
        return reports.all();
    }
}
```

In the After, an edited cell carries a `LateRow`, never a domain object,
so the table depends on values shaped for the screen (rule 4).
`setValueAt` writes no field: it hands the row and the typed text to the
edit listener the presenter registered, which is
`LateBoardPresenter.waitEdited`; that runs `MaintainLateBoard.correct`
in a worker's `doInBackground`, shows the rows it answers in `done`, and
puts the report's refusal on the board when a wait is outside the range
`RunningLateReport` allows (rules 1 and 4). `RunningLateReport` has no
public writer, and `withExpectedWait` refuses a wait its rules forbid
before anything is stored. `MaintainLateBoard` stores each corrected
report through `LateReports` under the clinician's name; the fence
leaves out the store's code and its transaction. A second correction
made from the same load is refused by the store's version on the
clinician's row, which the fence leaves out.

## The state it ends in

The table shows `LateRow` values, an edited cell hands its intent to the
presenter, and the domain report keeps its rules through a constructor
and `withExpectedWait`. That state keeps rule 4: the table is backed by
the presenter's row values and never writes a domain object.
