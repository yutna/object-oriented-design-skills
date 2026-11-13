---
name: oo-csharp-aspnet
description: Use when ASP.NET Core code picks a scoped or singleton lifetime, tracks entities with EF Core, or keeps logic out of MapPost endpoints and middleware.
license: MIT
metadata:
  version: 0.17.1
  pack: object-oriented-design-skills
---

# Designing Objects on ASP.NET Core

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what ASP.NET Core changes on top of `oo-csharp`:
load that skill too, because its rules on records, nullable reference
types, structs, refusals and async still hold in an ASP.NET Core code
base. The framework supplies the container, the request pipeline and
EF Core; each of them offers a place to keep a decision that belongs to
the domain: a singleton that captures a scoped context, an entity whose
public setters hand its state to an endpoint, a bulk update that writes
behind the entity, several saves in one use case, and an endpoint or
middleware that grows the business logic. ASP.NET Core 10 and EF Core
10 on .NET 10 change where these rules are kept, not what they require.

## When to use

- A service, hosted service, middleware or singleton takes a
  `DbContext` or another scoped service.
- An entity has public setters, or its rules live in the endpoint that
  loads and saves it.
- A concurrency token, a unique index or an optimistic concurrency
  failure is being designed.
- A use case saves more than once, or a read tracks entities it never
  changes.
- A value object is mapped as an owned entity type, or a complex type
  is being weighed against one.
- A `MapPost` endpoint or a middleware holds a rule, a chain of
  checks, or a store call.
- A refusal from the domain reaches the caller as an HTML error page
  rather than problem details.

## When not to use

- The code is plain C# that uses no ASP.NET Core or EF Core type, which
  `oo-csharp` covers.
- The question is how a Razor or Blazor component splits its state from
  the domain: outside this skill, and
  `oo-separating-presentation-from-domain` covers the core rule.
- A question no ASP.NET Core or EF Core feature changes, such as which
  object owns a rule: the core skills, starting from `oo-design`.
- The code is Java on Spring or Jakarta EE, which `oo-java-spring` and
  `oo-java-jakarta-ee` cover.

## Core rules

1. Rule. **Register each service with the lifetime of what it holds: a
   `DbContext`, and every service that holds one, is scoped; no
   singleton holds a scoped service; a hosted service creates a scope
   for each unit of work through `IServiceScopeFactory`, as
   `oo-inverting-dependencies` rules 2 and 3 and `oo-taming-persistence`
   rule 4 ask.** `AddScoped` registers a service for one request in MVC
   or Razor Pages, or one circuit in Blazor, and `AddDbContext`
   registers a context scoped by default. A service must not use a
   context whose lifetime is shorter than its own. A singleton keeps a
   scoped service for the life of the process, and a hosted service is
   registered as a singleton: it cannot take a scoped service such as a
   context in its constructor, and no scope is created for it by
   default. Take `IServiceScopeFactory` instead, call `CreateScope()`,
   resolve the scoped services from `scope.ServiceProvider`, and
   dispose the scope with the unit of work.
   A middleware that is not factory-based is activated once, so a scoped
   service goes in `Invoke` or `InvokeAsync`, or the middleware is
   factory-based. In the Development environment the default provider
   performs scope checks for a scoped service resolved from the root
   provider or injected into a singleton.

2. Default. **Make `Program.cs`, or one registration method per module
   that it calls, the composition root: each port is registered with
   its adapter there, and no domain class receives `IServiceProvider`,
   as `oo-inverting-dependencies` rules 3, 4 and 5 ask.** The
   application's services are registered on `builder.Services` where
   the host is built, and each `AddScoped<IPort, Adapter>` call names
   the port and the adapter together. A domain class takes its
   collaborators through its constructor; it neither resolves a service
   nor receives the container that could. A module may move its
   registrations into one `AddClinicModule` method, but the method is
   called from `Program.cs` and the root still reads as the object
   graph.

   The exception is a type the framework builds for a request without a
   registration of its own, such as an MVC controller: ASP.NET Core
   does not register controllers as services by default, the framework's
   activator resolves their constructor parameters from the container,
   and the root never constructs the controller. The controller names no
   container.

3. Rule. **Keep an entity's invariants under EF Core: private setters,
   state changed only through methods named for domain actions that
   check before they change anything, and a constructor that EF Core
   binds by parameter name, as `oo-encapsulating-state-and-behaviour`
   rules 1 and 2, `oo-constructing-valid-objects` rules 1 and 3, and
   `oo-working-within-a-framework` rule 1 ask.** EF Core calls the
   constructor whose parameter names and types match mapped properties,
   with camel-case parameters for Pascal-case properties, and it
   accepts a constructor of any accessibility, though a lazy-loading
   proxy needs it reachable from the proxy class. Properties without a
   setter are not mapped by convention; EF Core treats a private setter
   as read-write, so a private setter keeps the property mapped while
   callers cannot assign it. The constructor sets each required field
   and checks the values that arrive, and the entity's `Offer`, `Send`
   or `Record` method reads the current state, refuses the call that
   the rule forbids, and only then changes a field. A public setter
   hands the same change to every caller, the endpoint included, with no
   check at all.

   When a property's accessor must not see the value EF Core writes,
   configure a backing field in `OnModelCreating`; with a backing field
   configured, EF Core reads and writes the field, not the property.

4. Rule. **Give an entity that two requests can change at once a
   concurrency token, or hold the rule it guards with a unique index,
   both configured in the model (`IsConcurrencyToken`, `IsRowVersion`
   or `HasIndex` in `OnModelCreating`) rather than by an attribute on
   the domain type, and let the adapter turn the resulting
   `DbUpdateConcurrencyException` or `DbUpdateException` into the
   domain's refusal, as `oo-working-within-a-framework` rule 1,
   `oo-encapsulating-state-and-behaviour` rule 1 and
   `oo-designing-failure-behaviour` rule 7 ask.** A concurrency token is
   loaded with the entity and compared at `SaveChangesAsync`; when the
   row changed since it was read, EF Core throws
   `DbUpdateConcurrencyException`. Use `IsConcurrencyToken` for a token
   the application assigns, and `IsRowVersion` for a provider-managed
   row version where the provider has one. A unique index made with
   `HasIndex(...).IsUnique()` holds a rule that no second row may
   repeat, whatever code writes first, and a duplicate insert raises a
   save error. EF Core reports a failed save as a `DbUpdateException`.
   The model configuration stays in the adapter; an attribute such as
   `[Timestamp]` or `[ConcurrencyCheck]` puts the store's marker on the
   domain type. Catch the two store exceptions where the port is
   implemented, and throw the refusal the domain already names, such as
   `WaitlistEntryAlreadyOffered`, so the use case and the endpoint never
   see the store's exception.

5. Rule. **Treat one `DbContext` as one unit of work: the application
   service loads, sends the commands and calls `SaveChangesAsync` once,
   and a read that applies no rule uses `AsNoTracking` and projects to a
   record, as `oo-taming-persistence` rules 4 and 6 and
   `oo-layering-the-system` rule 6 ask.** A context is designed for a
   single unit of work and is not thread-safe. It loads the aggregate,
   the entity's method changes it, and one `SaveChangesAsync` writes
   every tracked change, inside the request's scope. A second save
   splits one use case into two units: a failure after the first leaves
   half the change stored, and the second load sees state the first
   save already wrote. A read that decides nothing suits `AsNoTracking`
   because it needs no change tracker and does no identity resolution;
   add `Select` to return a record of the fields the caller reads, so no
   entity outlives the query it came from.

6. Default. **Map a value object as a complex type configured in the
   model (`ComplexProperty` in `OnModelCreating`), with no EF attribute
   on the value type, rather than as an owned entity type, as
   `oo-modeling-values-and-entities` rules 2 and 3 and
   `oo-taming-persistence` rule 2 ask.** A complex type has no identity,
   compares by value, and is the mapping EF Core describes for a value
   object; it is not discovered by convention, so `OnModelCreating`
   names each property that maps one. An owned entity type is still an
   entity type behind the scenes: it has a hidden key and reference
   semantics, so two equal values are not the same stored object, and a
   value belongs in a complex type instead. In EF Core 10 a complex
   property may be optional, hold a collection mapped with `ToJson`, or
   be a `struct` or `record struct`; each is still a value with no
   identity.

   The exception is a value that the existing schema already maps as an
   owned entity type in its own table: a complex type is stored in its
   container's table or a JSON column and never in its own table, so
   changing the mapping moves columns and rows. Keep the owned mapping
   until a planned schema change, and map every new value as a complex
   type.

7. Default. **Keep endpoints and middleware at the edge: an endpoint
   binds a request record, checks its shape, builds the domain's values
   and calls the application service, and one `IExceptionHandler` turns
   the domain's refusals into problem details, as
   `oo-placing-domain-logic` rule 5, `oo-crossing-system-boundaries`
   rules 1 and 2, and `oo-designing-failure-behaviour` rule 7 ask.** A
   minimal API route handler binds route values, a JSON body and the
   services registered in the container; it turns the request record
   into domain values through their constructors and leaves the
   decision to the domain. A middleware reads the request or writes the
   response and then calls the next middleware; a business condition
   found there moves inward. One `IExceptionHandler` is registered with
   `AddExceptionHandler<T>()`, called by `UseExceptionHandler()`, and
   maps each refusal type to its status and problem details;
   `AddProblemDetails()` registers the problem details service that
   writes the body.

   The exception is a read that decides no rule, such as a list of a
   clinician's open appointments: the endpoint may call a query that
   projects to a record and return it, and no domain object or
   application service stands in the way.

## Pattern

`WaitlistEntry` is a patient waiting for an appointment with a
clinician. Two entries for the same patient and clinician are two
entries, so it is an entity, and its status a rule guards: only a
waiting entry may be offered an appointment. The first version leaves
the status open to any caller and puts the check in the endpoint. The
second keeps the check in the entity and gives the endpoint one call to
make.

Before:

```csharp
using Microsoft.EntityFrameworkCore;

public enum WaitlistStatus
{
    Waiting,
    Offered
}

public sealed class WaitlistEntry
{
    public int Id { get; set; }
    public string PatientId { get; set; } = "";
    public string ClinicianId { get; set; } = "";
    public WaitlistStatus Status { get; set; } = WaitlistStatus.Waiting;
    public DateTime? OfferedAt { get; set; }
}

public sealed class WaitlistDb(DbContextOptions<WaitlistDb> options)
    : DbContext(options)
{
    public DbSet<WaitlistEntry> WaitlistEntries =>
        Set<WaitlistEntry>();
}

public static class WaitlistEndpoints
{
    public static void MapWaitlistEndpoints(this WebApplication app)
    {
        app.MapPost("/waitlist/{id:int}/offer",
            async (int id, WaitlistDb db) =>
            {
                var entry = await db.WaitlistEntries.FindAsync(id);
                if (entry is null)
                {
                    return Results.NotFound();
                }
                if (entry.Status != WaitlistStatus.Waiting)
                {
                    return Results.Conflict();
                }
                entry.Status = WaitlistStatus.Offered;
                entry.OfferedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.NoContent();
            });
    }
}
```

In the Before, `WaitlistEntry` has public setters, so every caller,
including the endpoint, can write `Status` and `OfferedAt` with no check
(rule 3). The endpoint reads `Status`, decides whether the offer is
allowed, and writes both fields, so the rule lives in the edge and a
second caller reaches the same state by a different path (rule 3). The
one `SaveChangesAsync` keeps the request to one unit of work, so rule 5
is not the defect here. The fence stores the waitlist row under its id
in the waitlist table, inside the request's scope, with that one call;
`AddDbContext` in `Program.cs` makes `WaitlistDb` scoped, and the fence
leaves that registration out.

After:

```csharp
using Microsoft.EntityFrameworkCore;

public enum WaitlistStatus
{
    Waiting,
    Offered
}

public sealed class WaitlistEntry
{
    public int Id { get; private set; }
    public string PatientId { get; private set; } = "";
    public string ClinicianId { get; private set; } = "";
    public WaitlistStatus Status { get; private set; }
    public DateTime? OfferedAt { get; private set; }

    public WaitlistEntry(
        int id, string patientId, string clinicianId)
    {
        if (string.IsNullOrWhiteSpace(patientId))
        {
            throw new ArgumentException(
                "a waitlist entry names its patient",
                nameof(patientId));
        }
        if (string.IsNullOrWhiteSpace(clinicianId))
        {
            throw new ArgumentException(
                "a waitlist entry names its clinician",
                nameof(clinicianId));
        }
        Id = id;
        PatientId = patientId;
        ClinicianId = clinicianId;
        Status = WaitlistStatus.Waiting;
    }

    public void Offer(DateTime at)
    {
        if (Status != WaitlistStatus.Waiting)
        {
            throw new WaitlistEntryAlreadyOffered(Id);
        }
        Status = WaitlistStatus.Offered;
        OfferedAt = at;
    }
}

public sealed class WaitlistEntryAlreadyOffered(int id)
    : InvalidOperationException(
        $"waitlist entry {id} was already offered");

public sealed class WaitlistEntryNotFound(int id)
    : InvalidOperationException($"no waitlist entry {id}");

public sealed class WaitlistDb(DbContextOptions<WaitlistDb> options)
    : DbContext(options)
{
    public DbSet<WaitlistEntry> WaitlistEntries =>
        Set<WaitlistEntry>();
}

public sealed class OfferWaitlistEntry(WaitlistDb db, TimeProvider time)
{
    public async Task OfferAsync(int waitlistEntryId)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var entry = await db.WaitlistEntries
            .FindAsync(waitlistEntryId)
            ?? throw new WaitlistEntryNotFound(waitlistEntryId);
        entry.Offer(now);
        await db.SaveChangesAsync();
    }
}

public static class WaitlistEndpoints
{
    public static void MapWaitlistEndpoints(this WebApplication app)
    {
        app.MapPost("/waitlist/{id:int}/offer",
            async (int id, OfferWaitlistEntry offer) =>
            {
                await offer.OfferAsync(id);
                return Results.NoContent();
            });
    }
}
```

In the After, every property has a private setter and the constructor
sets the fields EF Core binds by name, so the entity is mapped and no
caller can assign a field (rule 3). `Offer` is the one method that
changes `Status` and `OfferedAt`; it checks the current status and
throws `WaitlistEntryAlreadyOffered` before it changes anything, so the
check sits in the entity rather than in one caller (rule 3). Two
requests that load the same waiting entry at once both pass `Offer`'s
check and both save; the concurrency token rule 4 describes, left out
of this fence, is what refuses the second.
`Program.cs` registers `WaitlistDb` with `AddDbContext` and
`OfferWaitlistEntry` with `AddScoped`, both scoped, and registers
`TimeProvider.System` as a singleton. It registers one
`IExceptionHandler` with `AddExceptionHandler<WaitlistExceptionHandler>()`,
and calls `UseExceptionHandler()` and `AddProblemDetails()`; the fence
leaves those registrations and the handler out. The handler maps
`WaitlistEntryNotFound` to 404 and `WaitlistEntryAlreadyOffered` to
409, each with problem details, so neither refusal reaches the caller
as a 500 (rule 7). `OfferWaitlistEntry` asks the `TimeProvider` once
and passes that value to `Offer`, so the time comes from a collaborator
passed in rather than from a static call, which keeps
`oo-designing-for-testability` rule 5. It loads the entry, sends
`Offer`, and calls `SaveChangesAsync` once, so the use case is one unit
of work (rule 5).
The endpoint binds the route value and calls the application service;
it neither tests the status nor writes a field. The fence stores the
offered entry under its id in the waitlist table, inside the request's
scope, with the one `SaveChangesAsync` the application service calls.
The state keeps rules 3 and 5: the entity owns the check, and the use
case owns one save.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A singleton, a hosted service, a middleware constructor or a static
  field that holds a `DbContext` or another scoped service.
- `AddSingleton` or `AddTransient` for a service that holds a
  `DbContext`, or an `AddDbContext` overload that asks for a lifetime
  longer than the request.
- An entity with a public setter, or a public parameterless
  constructor added only for the store.
- An endpoint, a middleware or a controller that reads an entity's
  state, decides, and then sets it.
- An `ExecuteUpdate` or `ExecuteUpdateAsync` that writes a field a rule
  guards, behind the entity's method.
- More than one `SaveChangesAsync` in one use case, or a save in an
  endpoint and another in the service it calls.
- `AsNoTracking` on an entity the use case then changes.
- A value object mapped as an owned entity type, or a value type
  carrying `[ComplexType]`, `[Timestamp]`, `[ConcurrencyCheck]` or
  another EF attribute.
- A rule that two requests can break with no concurrency token and no
  unique index behind it.
- A domain refusal that reaches the caller as a 500 or an HTML error
  page because no `IExceptionHandler` maps it.
- An `IServiceProvider` parameter in a domain class, or a service
  resolved from `HttpContext.RequestServices` where a constructor
  parameter was available.

## Common mistakes

- Registering a service that holds a `DbContext` as a singleton because
  its own fields look stateless.
- Injecting a `DbContext` into a hosted service's constructor, then
  reusing that one context for every sweep.
- Adding a private parameterless constructor for EF Core instead of the
  constructor it binds by parameter name.
- Making an entity's setters public "for EF Core" when a private setter
  is mapped and keeps callers out.
- Calling `SaveChangesAsync` after each change in a use case, so a
  failure leaves the first change stored.
- Using `AsNoTracking` and then changing the entity, expecting the next
  save to write it.
- Mapping a value as an owned entity type and accepting its hidden key
  and reference equality.
- Putting a concurrency token in an attribute on the domain type
  rather than in `OnModelCreating`.
- Catching `DbUpdateConcurrencyException` in the endpoint and deciding
  the domain's refusal there.
- Trusting a validation attribute or a request record to hold a rule
  the domain must keep.

## Related skills

- `oo-csharp` holds the language rules this skill applies, including
  its rules on records, nullable reference types and async.
- `oo-inverting-dependencies` decides how collaborators reach an object
  and where the composition root sits.
- `oo-taming-persistence` sets the unit of work and keeps a mapping
  decision in the adapter.
- `oo-encapsulating-state-and-behaviour` keeps state behind methods
  named for domain actions.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-working-within-a-framework` decides what a framework may shape and
  what stays in the domain.
- `oo-designing-failure-behaviour` names a refusal and translates an
  outside failure where it crosses a boundary.
- `oo-layering-the-system` keeps an endpoint and a store on their own
  sides of the domain.
- `oo-modeling-values-and-entities` decides value or entity and what
  equality reads.
- `oo-placing-domain-logic` keeps an application service to
  coordination.
- `oo-crossing-system-boundaries` gives each contract its own transfer
  types.
- `oo-designing-aggregates` decides what one transaction changes.
- `oo-designing-repositories` declares a read and a repository in the
  domain's words.
- `oo-separating-presentation-from-domain` splits a screen's state from
  the domain.

## Further reading

- [Lifetimes and scopes](references/lifetimes-and-scopes.md)
