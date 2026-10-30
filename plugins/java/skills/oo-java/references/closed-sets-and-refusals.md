# Closed Sets and Refusals

This file follows one feature through rules 3 to 6: the results a
laboratory sends back for an outpatient's blood sample, the follow-up
each result calls for, and the refusal when the laboratory rejects a
sample. The types share one file here to keep the example short; in the
code base each has its own.

- [The domain side](#the-domain-side)
- [The adapter](#the-adapter)
- [A worked change](#a-worked-change)

## The domain side

```java
import java.util.Optional;

sealed interface TestResult permits Normal, Abnormal, Inconclusive {}

record Normal() implements TestResult {}

record Abnormal(String finding) implements TestResult {}

record Inconclusive(String reason) implements TestResult {}

class SampleRejected extends Exception {
    SampleRejected(String sampleId) {
        super("sample " + sampleId + " was rejected by the laboratory");
    }
}

interface Laboratory {
    Optional<TestResult> resultOf(String sampleId) throws SampleRejected;
}

final class FollowUp {
    String nextStep(TestResult result) {
        return switch (result) {
            case Normal normal -> "no follow-up";
            case Abnormal abnormal -> "book a visit: " + abnormal.finding();
            case Inconclusive inconclusive -> "repeat the test";
        };
    }
}
```

- `TestResult` is sealed and its permitted classes are records, so the
  set of results is closed where the clinic closes it (rule 3).
- `FollowUp.nextStep` names every permitted class in a `switch`
  expression with no `default` branch (rule 3).
- `Laboratory` is the port. An empty `Optional` means the result is not
  back yet, which each caller decides about for itself (rule 6).
  `SampleRejected` is a refusal the caller can act on, by asking the
  patient for a new sample, so it is a checked exception the port
  declares (rules 4 and 5).

## The adapter

```java
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

final class ResultFolder implements Laboratory {
    private final Path folder;

    ResultFolder(Path folder) {
        this.folder = folder;
    }

    @Override
    public Optional<TestResult> resultOf(String sampleId)
            throws SampleRejected {
        Path file = folder.resolve(sampleId + ".txt");
        if (Files.notExists(file)) {
            return Optional.empty();
        }
        String line;
        try {
            line = Files.readString(file).strip();
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
        if (line.equals("REJECTED")) {
            throw new SampleRejected(sampleId);
        }
        if (line.equals("NORMAL")) {
            return Optional.of(new Normal());
        }
        if (line.startsWith("ABNORMAL ")) {
            return Optional.of(new Abnormal(line.substring(9)));
        }
        return Optional.of(new Inconclusive(line));
    }
}
```

- `ResultFolder` reads the text file the laboratory leaves for each
  sample. A missing file is an empty answer, the line `REJECTED` is the
  port's refusal, and any other line becomes one of the three results.
- `Files.readString` throws `IOException`, a checked exception the port
  does not declare. The adapter turns it into an `UncheckedIOException`,
  a fault that passes to the handler at the edge, and the port's
  contract stays in the clinic's words (rule 4).

## A worked change

The laboratory starts flagging critical results, which a clinician must
phone the patient about the same day.

1. The team adds a record `Critical`, which holds the finding and
   implements `TestResult`, and names it in the `permits` clause.
2. The compiler rejects `FollowUp.nextStep`, whose `switch` no longer
   covers every permitted class, and the team adds a case for
   `Critical` that answers "phone the patient today".
3. `ResultFolder` maps a line that starts `CRITICAL` to a `Critical`
   result before it checks for `ABNORMAL`.

The change ends with every `switch` over `TestResult` naming all four
results, and with the port still declaring the one refusal its adapter
throws, as rules 3 and 4 ask.
