# Lifetimes and Scopes

This file follows rule 1 through one background job: a sweep marks
screening invitations overdue when they have waited a month. The first
version is a hosted service that takes its `DbContext` in its
constructor, so, with scope validation off, one context serves every
sweep and outlives every unit of work. The change gives the service an
`IServiceScopeFactory`, and each sweep takes a scoped context from a
scope of its own.

- [The types](#the-types)
- [The hosted service as it is](#the-hosted-service-as-it-is)
- [The scope for each unit](#the-scope-for-each-unit)

## The types

```csharp
using Microsoft.EntityFrameworkCore;

public sealed class ScreeningDbContext(
    DbContextOptions<ScreeningDbContext> options)
    : DbContext(options)
{
    public DbSet<ScreeningInvitation> ScreeningInvitations =>
        Set<ScreeningInvitation>();
}

public sealed class ScreeningInvitation
{
    public int Id { get; private set; }
    public string PatientId { get; private set; } = "";
    public DateTime InvitedAt { get; private set; }
    public DateTime? FlaggedAt { get; private set; }

    public ScreeningInvitation(
        int id, string patientId, DateTime invitedAt)
    {
        if (string.IsNullOrWhiteSpace(patientId))
        {
            throw new ArgumentException(
                "a screening invitation names its patient",
                nameof(patientId));
        }
        Id = id;
        PatientId = patientId;
        InvitedAt = invitedAt;
    }

    public void FlagOverdue(DateTime at)
    {
        if (FlaggedAt is not null)
        {
            throw new ScreeningAlreadyFlagged(Id);
        }
        FlaggedAt = at;
    }
}

public sealed class ScreeningAlreadyFlagged(int id)
    : InvalidOperationException(
        $"screening invitation {id} was already flagged");
```

`ScreeningInvitation` is the entity the sweep reads: its constructor
takes the fields EF Core binds by parameter name, its setters are
private, and `FlagOverdue` checks before it writes, so the type keeps
rule 3 as well as the lifetime rule this file follows. `FlaggedAt` is
null until the sweep flags the invitation. `Program.cs` registers
`ScreeningDbContext` with `AddDbContext`, which makes the context
scoped by default, and registers `ScreeningSweep` with
`AddHostedService`, which makes the sweep a singleton; this file leaves
that registration out.

## The hosted service as it is

```csharp
using Microsoft.EntityFrameworkCore;

public sealed class ScreeningSweep(
    ScreeningDbContext db,
    ILogger<ScreeningSweep> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var overdue = await db.ScreeningInvitations
                .Where(invitation =>
                    invitation.FlaggedAt == null &&
                    invitation.InvitedAt <= cutoff)
                .ToListAsync(stoppingToken);
            foreach (var invitation in overdue)
            {
                invitation.FlagOverdue(DateTime.UtcNow);
                logger.LogWarning(
                    "Screening invitation {Id} is overdue",
                    invitation.Id);
            }
            await db.SaveChangesAsync(stoppingToken);
            await Task.Delay(
                TimeSpan.FromMinutes(15), stoppingToken);
        }
    }
}
```

The constructor asks the container for `ScreeningDbContext`, and the
host registers `ScreeningSweep` as a hosted service, which is a
singleton. A hosted service is meant to create a scope for each unit
of work rather than take a scoped service such as a `DbContext` in its
constructor, and no scope is created for it by default. With scope
validation off, as it is by default outside Development, the
registration succeeds: it asks the root for a scoped context, whose
lifetime the root container promotes to its own, so one context serves
every sweep and outlives every unit of work, and its change tracker
carries the first sweep's tracked entities into the next. In
Development the default provider validates scopes, and building the
host throws `Cannot consume scoped service 'ScreeningDbContext' from
singleton 'Microsoft.Extensions.Hosting.IHostedService'`, so the
Before never starts. The fence stores each overdue invitation's
`FlaggedAt` value under the invitation's id in the screening table,
inside the transaction `SaveChangesAsync` opens, with the one save in
each sweep.

## The scope for each unit

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class ScreeningSweep(
    IServiceScopeFactory scopeFactory,
    TimeProvider time,
    ILogger<ScreeningSweep> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using (var scope = scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider
                    .GetRequiredService<ScreeningDbContext>();
                var now = time.GetUtcNow().UtcDateTime;
                var cutoff = now.AddDays(-30);
                var overdue = await db.ScreeningInvitations
                    .Where(invitation =>
                        invitation.FlaggedAt == null &&
                        invitation.InvitedAt <= cutoff)
                    .ToListAsync(stoppingToken);
                foreach (var invitation in overdue)
                {
                    invitation.FlagOverdue(now);
                    logger.LogWarning(
                        "Screening invitation {Id} is overdue",
                        invitation.Id);
                }
                await db.SaveChangesAsync(stoppingToken);
            }
            await Task.Delay(
                TimeSpan.FromMinutes(15), stoppingToken);
        }
    }
}
```

`ScreeningSweep` now takes `IServiceScopeFactory`, which the container
registers as a singleton, and the `TimeProvider` that `Program.cs`
registers as a singleton, so the hosted service holds no scoped
service. Each sweep asks that provider once, and the same answer serves
the cutoff and every `FlagOverdue` call, which keeps
`oo-designing-for-testability` rule 5. Each sweep opens one scope,
resolves the scoped `ScreeningDbContext` from `scope.ServiceProvider`,
uses it for the load, the changes and one `SaveChangesAsync`, and
disposes it when the scope ends. Each sweep's scope disposes its
context when the unit of work ends, so the context is never shared
between sweeps. An exception that leaves one sweep also leaves
`ExecuteAsync`, and the host stops by default, so no later sweep reuses
that context. The fence stores each overdue invitation's `FlaggedAt`
value under the invitation's id in the screening table, inside the
transaction the scope's one `SaveChangesAsync` opens; each scope holds
one unit of work. The state keeps rule 1 and
`oo-designing-for-testability` rule 5: the singleton holds no scoped
service, and every sweep asks one provider once and passes the answer
on.
