---
name: oo-java-jakarta-ee
description: Use when Java code on Jakarta EE picks a CDI bean or a @Stateless EJB, or a container transaction commits work that a refusal should undo.
license: MIT
metadata:
  version: 0.17.1
  pack: object-oriented-design-skills
---

# Designing Objects on Jakarta EE

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what Jakarta EE changes on top of `oo-java`: load
that skill too, because its rules on records, checked exceptions,
equality and final classes still hold in a container. CDI 4.1, Jakarta
Transactions 2.0, Jakarta Enterprise Beans 4.0 and Jakarta Persistence
3.2 on Java 21 or later change how those rules are kept, not what they
require. The container builds some objects, injects others, starts
transactions around business methods and commits them when a method
returns; the rules below say where a design gives way and where it must
not.

## When to use

- A class could be a CDI bean or a `@Stateless` EJB, and the code has to
  choose between them.
- A field carries `@Inject` or `@PersistenceContext`, or domain code
  calls `CDI.current()`.
- A domain class reaches the container through a bean-defining
  annotation such as `@ApplicationScoped`.
- A `@Stateless` method writes and then throws a checked refusal, or a
  `@Transactional` method does.
- A method that needs its own transaction or interceptor is called
  through `this`.
- A JPA entity has setters, a public no-argument constructor, or no
  checking constructor.
- A final class is a normal-scoped bean or carries `@Transactional`.

## When not to use

- The code is plain Java with no framework. `oo-java` covers it.
- The code is built on Spring, even where it uses Jakarta Persistence
  or Jakarta annotations. `oo-java-spring` covers it.
- The question is one no Jakarta EE feature changes, such as which
  object owns a rule. The core skills answer it, starting from
  `oo-design`.

## Core rules

1. Rule. **Inject every collaborator through one `@Inject` constructor:
   no field injection, and no `CDI.current()` or JNDI lookup in domain
   code; a normal-scoped bean, or one with a bound interceptor such as
   `@Transactional`, also keeps the non-private no-argument constructor
   its proxy needs, which no code of yours calls:
   `oo-inverting-dependencies` rules 2 and 5.** The bean constructor is
   the one annotated `@Inject`, and two such constructors are a
   definition error (CDI 4.1 section 3.5.1). CDI 4.1 section 3.10 asks
   a bean type to be proxyable when the bean requires a client proxy or
   has a bound interceptor, and a class without a non-private
   constructor with no parameters is not proxyable, so a normal-scoped
   bean and a bean with `@Transactional` both keep one that only the
   container calls. An enterprise bean keeps the public no-argument
   constructor its container requires (Jakarta Enterprise Beans 4.0
   section 4.9.2) and receives its collaborators through the `@Inject`
   constructor.

2. Default. **Keep domain classes free of CDI and enterprise bean
   annotations, and make them in `@Produces` methods of one producer
   class that reads as the composition root; bean-defining annotations
   stay on edge classes such as resources and adapters:
   `oo-inverting-dependencies` rules 3 and 4,
   `oo-working-within-a-framework` rule 2.** CDI 4.1 section 7.1 says
   an object a producer method returns that is not another bean is not
   injected or intercepted on its own, so the class stays plain, and
   section 2.5 says the default discovery mode is `annotated`, so a
   class without a bean-defining annotation is not discovered. The
   producer class is the one place that names each domain object and
   the collaborators it takes.

   The exception is a domain object the use case builds for one call:
   the object that holds the use case builds it with `new` from values
   it already holds, so no producer method builds it, and the class
   still imports nothing from `jakarta.enterprise`, `jakarta.inject` or
   `jakarta.ejb`.

3. Judgement. **Choose a CDI bean with `@Transactional` for an
   application service, since Jakarta Concurrency gives CDI beans
   asynchronous and scheduled methods, and an enterprise bean only for
   a container service the code needs that CDI beans do not get; make
   that choice once for the code base: `oo-working-within-a-framework`
   rules 3 and 4.** `@Transactional` is an interceptor binding, and a
   method that carries it on a CDI bean gets a container transaction
   with `TxType.REQUIRED` as the default (Jakarta Transactions 2.0
   section 3.7). Jakarta Concurrency 3.1 lets a CDI managed bean method
   carry `@Asynchronous`, and its `runAt` schedules repeated execution,
   so asynchronous and scheduled work is not by itself a reason to
   choose an enterprise bean. What tips the balance is whether the code
   needs a container service that CDI beans do not get; decide it once,
   as `oo-working-within-a-framework` rule 4 asks, not class by class.

4. Rule. **Let a refusal leave nothing written: refuse before anything
   changes, and where a refusal can come after a change, make the
   transaction roll back without putting a container annotation on the
   domain's refusal, because a checked exception commits by default: on
   a CDI bean name the refusal in `@Transactional`'s `rollbackOn`, and
   in a container-managed enterprise bean mark the transaction for
   rollback through the bean's context before the refusal leaves the
   method: `oo-designing-failure-behaviour` rule 4,
   `oo-taming-persistence` rule 4, `oo-designing-aggregates` rule 4.**
   A `@Transactional` method marks the transaction for rollback on a
   `RuntimeException` by default and not on a checked exception, unless
   `rollbackOn` names it (Jakarta Transactions 2.0 section 3.7). A
   container-managed enterprise bean calls `setRollbackOnly` on its
   `EJBContext` to mark the transaction such that it can never commit,
   and the spec names that call as the step before throwing an
   application exception that is not specified to roll back (Jakarta
   Enterprise Beans 4.0 section 8.3.4.2); a checked exception in the
   bean's business method is an application exception and does not roll
   back on its own (section 9.2.1). Both paths otherwise leave the
   write committed.

5. Rule. **Reach a method that needs its own transaction or interceptor
   through an injected reference to another bean, because a call
   through `this` is a plain Java call that no interceptor sees:
   `oo-placing-domain-logic` rule 2, `oo-taming-persistence` rule 4.**
   CDI 4.1 section 7.2 treats a method invocation as a business method
   invocation when the application invokes a method of a bean through a
   contextual reference to the bean, and says an invocation that is not
   a business method invocation is treated as a normal Java method call
   and is not intercepted by the container. A call on `this` does not
   pass through a contextual reference, so no interceptor sees it, and
   the transaction or interceptor advice runs only when the call enters
   a bean reference. A unit that needs its own transaction therefore
   lives on another bean and the caller reaches it through the injected
   reference.

6. Default. **A Jakarta Persistence entity that is a domain object
   keeps its rules: a `protected` no-argument constructor that only the
   provider calls, a checking constructor or named factory for every
   other caller, and methods named for domain actions instead of
   setters: `oo-encapsulating-state-and-behaviour` rules 1 and 2,
   `oo-constructing-valid-objects` rule 3,
   `oo-working-within-a-framework` rule 1.** Jakarta Persistence 3.2
   section 2.1 requires a public or protected no-argument constructor
   that the provider calls and a non-final entity class. The
   constructor is the provider's way in; every other caller uses the
   checking constructor or named factory, so no instance exists in a
   state the clinic forbids. A setter would let a caller change a field
   without the rule, which `oo-encapsulating-state-and-behaviour` rule
   2 asks the entity to keep behind a method named for the action.

   The exception is an entity mapped by property access: the provider
   reads and writes each persistent property through an accessor, so
   the entity gives it a `protected` getter and setter pair, and every
   other caller still uses the action methods that name the change.

7. Rule. **Leave non-final exactly the classes the container or the
   provider subclasses or requires open, a normal-scoped bean class, a
   class with a bound interceptor such as `@Transactional`, an
   enterprise bean class, and an entity, and say beside each that it
   relaxes `oo-java` rule 7; a domain class made by a producer method
   that declares no scope keeps that rule, because a `@Dependent` bean
   needs no client proxy: `oo-java` rule 7,
   `oo-honouring-substitutability` rule 5.** CDI 4.1 section 3.10
   treats a final class as unproxyable when the bean type needs a
   client proxy or has a bound interceptor, and section 5.4 says a
   client proxy is never required for a `@Dependent` bean. A producer
   method that declares no scope produces a `@Dependent` bean (section
   2.4.4), so the domain class it returns may stay final. Jakarta
   Enterprise Beans 4.0 section 4.9.2 requires a session bean class to
   be public, not final and not abstract. Jakarta Persistence 3.2
   section 2.1 requires an entity to be non-final. The sentence beside
   each non-final class in the code says which case it is.

## Pattern

`CancellationCutoff` decides whether a cancellation came too late for
the clinic's notice rule, from the appointment's start and the clinic's
clock. It is a domain class: a rule the clinic owns, not an object the
container describes.

Before:

```java
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@ApplicationScoped
public class CancellationCutoff {
    @Inject
    private Clock clock;

    public boolean hasPassed(Instant startsAt) {
        return clock.instant().isAfter(
            startsAt.minus(Duration.ofHours(24)));
    }
}
```

In the Before, `@ApplicationScoped` makes the container discover,
build and proxy a domain class, which breaks rule 2, and `@Inject` on
the field hands the clock over after construction, which breaks rule 1.
The class is non-final because an `@ApplicationScoped` bean needs a
client proxy, which relaxes `oo-java` rule 7. The fence stores nothing.

After:

```java
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

public final class CancellationCutoff {
    private final Clock clock;

    public CancellationCutoff(Clock clock) {
        this.clock = clock;
    }

    public boolean hasPassed(Instant startsAt) {
        return clock.instant().isAfter(
            startsAt.minus(Duration.ofHours(24)));
    }
}
```

```java
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import java.time.Clock;

@ApplicationScoped
public class CancellationConfiguration {
    @Produces
    Clock clock() {
        return Clock.systemUTC();
    }

    @Produces
    CancellationCutoff cancellationCutoff(Clock clock) {
        return new CancellationCutoff(clock);
    }
}
```

In the After, `CancellationCutoff` has no CDI annotation or import,
takes the clock through its constructor into a final field, and is
final, which keeps rules 1 and 2. `CancellationConfiguration` is the
composition root: its `@Produces` methods name each object and the
collaborator it takes, and the domain class is built there. The
producer method declares no scope, so CDI makes a `@Dependent` bean,
which needs no client proxy and lets the class stay final; that keeps
`oo-java` rule 7. `CancellationConfiguration` itself is non-final
because its `@ApplicationScoped` scope needs a client proxy, which
relaxes `oo-java` rule 7. Neither fence stores anything.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- `@Inject` on a field or a setter.
- `@ApplicationScoped` or another bean-defining annotation on a domain
  class.
- `CDI.current()` or a JNDI lookup in domain code.
- `@Produces` methods scattered across several classes.
- A `@Stateless` bean chosen without a container service CDI beans do
  not get.
- A checked refusal thrown after a write from a container-managed
  enterprise bean method without `@ApplicationException(rollback =
  true)`.
- A `@Transactional` method that can throw a checked refusal without
  `rollbackOn`.
- A call through `this` to a method that needs its own transaction or
  interceptor.
- A final class that is a normal-scoped bean, carries
  `@Transactional`, or is a session bean.
- A JPA entity with a public no-argument constructor or a setter.
- A producer method for a domain class that declares a normal scope
  while the class is final.

## Common mistakes

- Adding `@Inject` to a field because the constructor would take one
  more parameter.
- Putting `@ApplicationScoped` on a domain class to make it injectable.
- Expecting a checked refusal from a `@Stateless` method to roll back;
  the container commits instead.
- Calling a `@Transactional` method from another method of the same
  bean and expecting a second transaction.
- Relying on a checked exception to roll back a `@Transactional` method
  without naming it in `rollbackOn`.
- Making a domain class final and then giving it a normal scope.
- Adding a public no-argument constructor and setters to an entity for
  the provider.
- Declaring a producer method `@ApplicationScoped` for a final domain
  class.
- Choosing `@Stateless` for asynchronous work that `@Asynchronous`
  gives a CDI bean.

## Related skills

- `oo-java` holds the language rules this skill applies, including rule
  7 on final classes.
- `oo-java-spring` is the same work on Spring; its transactions and
  proxies differ, so load that skill instead when Spring builds the
  beans.
- `oo-inverting-dependencies` decides how collaborators reach an
  object and where the composition root sits.
- `oo-working-within-a-framework` decides what a framework may shape
  and what stays in the domain.
- `oo-designing-failure-behaviour` tells a refusal from a fault and
  keeps a refusal from being ignored.
- `oo-taming-persistence` sets the unit of work and keeps a store's
  session inside its transaction.
- `oo-designing-aggregates` decides what one transaction changes.
- `oo-placing-domain-logic` keeps an application service to
  coordination.
- `oo-encapsulating-state-and-behaviour` keeps state behind methods
  named for domain actions.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-honouring-substitutability` decides which classes stay open.

## Further reading

- [Refusals that roll back](references/refusals-that-roll-back.md)
