using System;

namespace Clinic;

public sealed class Visit
{
    public Visit(Guid id, VisitWindow window)
    {
        Id = id;
        Window = window;
    }

    public Guid Id { get; }

    public VisitWindow Window { get; }
}
