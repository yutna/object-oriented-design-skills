# Secrets and depth

A module earns its boundary by keeping a decision that is likely to
change. Splitting work by the order of its steps gives every class the
same decision to know. Depth is the same idea seen from the caller's
side: a small interface over work that stays inside.

## A decision, not a step

A clinic exports each visit to a file that another system reads. In a
design split by steps, `ExportWriter` and `ExportReader` each keep the
file's column list, so the field order, the date layout and the text of
an empty note are known twice. A new column changes both classes, and
either can drift from the other without a test noticing until a file is
read back.

```text
class ExportWriter
  - columns: List<ColumnName>
  + new(columns: List<ColumnName>)
  + lineFor(visit: Visit): String

class ExportReader
  - columns: List<ColumnName>
  + new(columns: List<ColumnName>)
  + visitIn(line: String): Visit
```

`ColumnName` is taken to be a column name in the export file's own
terms. Each constructor sets its `columns` field from the list it
receives. The two lists agree only because someone keeps them in step.
`Visit` is the clinic's visit as the pack already models it; the
export carries one without changing the visit's shape.

The same work has one secret when the format lives in one module. The
writer asks for the line and the reader hands the line back, and neither
knows the columns.

```text
class VisitFile
  + lineFor(visit: Visit): String
  + visitIn(line: String): Visit

class ExportWriter
  - file: VisitFile
  + new(file: VisitFile)
  + lineFor(visit: Visit): String
    return file.lineFor(visit)

class ExportReader
  - file: VisitFile
  + new(file: VisitFile)
  + visitIn(line: String): Visit
    return file.visitIn(line)
```

`VisitFile.lineFor` is taken to lay out one visit in the file's field
order and answer the line, and `VisitFile.visitIn` is taken to read one
such line back into a visit. Each class sends one message, and each
constructor sets `file` before its method reads it. A new column changes
`VisitFile` alone. The format is the secret; the writer and the reader
are the steps.

## Deep or shallow

The Pattern's before `DayPlan` is shallow: three public messages about
blocks, and a caller must handle a day's blocks by index. After,
`DayPlan` is deep: `reserve` and `isFree` are two messages over the same
list, and the block layout and its index stay inside. The shallow class
asks callers to know as much as its code does; the deep class asks only
what a caller may want to do.

A class is not deep just because it is small. A wrapper that repeats an
outside library one method for one method has the outside interface plus
a shell, so a caller still knows every outside step. Depth comes from
hiding a decision, not from renaming each call.

## Splitting by steps

A process split into a class per step gives each class the same shared
format, limit or protocol to know, because every step touches the same
record. The format then has as many owners as there are steps, and a
change to it visits every one. Draw the line around the decision
instead: one class owns the format and offers the outcome, and the steps
either move inside it or send it messages. The steps still exist inside
the class; they are no longer the module boundary.
