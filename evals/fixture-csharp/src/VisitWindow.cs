using System;

namespace Clinic;

public sealed record VisitWindow
{
    public VisitWindow(DateTime start, DateTime end)
    {
        if (end <= start)
        {
            throw new ArgumentException(
                "A visit window must end after it starts.");
        }

        Start = start;
        End = end;
    }

    public DateTime Start { get; init; }

    public DateTime End { get; init; }
}
