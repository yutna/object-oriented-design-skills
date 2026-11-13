---
name: oo-java-spring
description: Use when Java code on Spring wires beans with @Autowired or annotations, places @Transactional, or gives a JPA entity setters instead of its own rules.
license: MIT
metadata:
  version: 0.17.1
  pack: object-oriented-design-skills
---

# Designing Objects on Spring

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

This skill holds only what Spring changes on top of `oo-java`: load
that skill too, because its rules on records, equality, refusals and
final classes still hold in a Spring code base. The annotations below
are where a design can slip: a field injected after construction, a
transaction that starts only when a call enters the proxy, an entity
whose setters hand its state to any service, and a repository whose
generic methods reach the domain. Spring Framework 7.0 and Spring Boot
4.1 on Java 21 or later change how these rules are kept, not what they
require.

## When to use

- A bean reaches a collaborator through an `@Autowired` field or
  setter, or asks an `ApplicationContext` for one.
- A class that holds a domain rule carries `@Service`, `@Component` or
  another annotation the container scans.
- `@Transactional` sits on a repository, a domain class or a method
  that another method of the same object calls.
- A JPA entity has setters, a public no-argument constructor, or no
  constructor that refuses invalid state.
- A Spring Data repository hands `save`, `delete` or another generic
  method to domain code.
- Lazy loading still runs while a view renders, after the use case has
  returned.
- A controller sends a request record into the domain, or trusts a
  request body without Bean Validation.

## When not to use

- The code is plain Java with no framework. `oo-java` covers that.
- The code runs in Jakarta EE's own container, such as CDI or
  enterprise beans with no Spring: outside this skill.
- The question is one no Spring feature changes, such as which object
  owns a rule. The core skills answer it, starting from `oo-design`.

## Core rules

1. Rule. **Inject every collaborator through the one constructor into a
   final field: no `@Autowired` on a field or a setter, and no
   `ApplicationContext` or `BeanFactory` lookup outside configuration
   classes.** A class with a single constructor needs no `@Autowired`,
   because Spring uses that constructor and its parameters say what the
   object needs before any method runs, as
   `oo-inverting-dependencies` rules 2 and 5 ask. A lookup hides those
   needs, and a field or setter injected after construction lets a
   half-built object exist.

2. Default. **Keep domain classes free of Spring annotations and
   imports, and build them in `@Bean` methods of `@Configuration`
   classes that read as the composition root; stereotype annotations
   and component scanning stay on edge classes such as controllers and
   adapters.** A `@Bean` method names the class it builds and the
   collaborators it takes, so the configuration reads as the object
   graph, while `@Service` on a domain class moves that decision into a
   scan, as `oo-inverting-dependencies` rules 3 and 4 and
   `oo-working-within-a-framework` rule 2 ask.

   The exception is a domain object the use case builds for one call:
   its owner builds it with `new` from values it already holds, so no
   `@Bean` method builds it, and the class still imports nothing from
   Spring.

3. Rule. **Put `@Transactional` on the public method of the application
   service that runs one use case, so that one transaction changes one
   aggregate, never on a domain class; a call from the same object
   starts no transaction, so a unit that needs its own transaction is
   reached through another bean or a `TransactionTemplate`.** Only a
   call that enters the proxy is intercepted, so a method calling
   another `@Transactional` method of the same object never passes the
   proxy. Protected and package-visible methods can be transactional
   for class-based proxies; interface-based proxies need public
   methods. This keeps `oo-placing-domain-logic` rule 2,
   `oo-taming-persistence` rule 4 and `oo-designing-aggregates` rule 4.

4. Default. **A JPA entity that is a domain object keeps its rules:
   field access, a `protected` no-argument constructor that only the
   provider calls, a checking constructor or named factory for every
   other caller, and methods named for domain actions instead of
   setters.** Field access lets the provider read and set the fields
   directly, so setters are required only with property access. The
   checking constructor keeps the invariant the entity holds, and an
   action method reads the current state before it changes what the
   action allows, as `oo-encapsulating-state-and-behaviour` rules 1 and
   2, `oo-constructing-valid-objects` rule 3 and
   `oo-working-within-a-framework` rule 1 ask.

   The exception is an entity whose mapped superclass maps by property
   access: the provider then reads and writes through accessors, so
   they stay `protected` and callers use the entity's action methods,
   which still name each change.

5. Rule. **Reach another aggregate by its identity, never by a mapped
   association to its root, and set `spring.jpa.open-in-view=false` so
   that no lazy load runs after the use case's transaction has ended.**
   Holding the other aggregate's object lets one change cross two
   boundaries, and an open entity manager keeps the session alive
   through the view, so a lazy association loads after the commit.
   Identity and a repository keep each aggregate whole, as
   `oo-taming-persistence` rule 5 and `oo-designing-aggregates` rule 3
   ask.

6. Default. **Check a request's shape with Bean Validation on a request
   record, with `@Valid` on the `@RequestBody` parameter, then build the
   domain's values from it in one place; no domain class receives the
   request record.** A failed check raises
   `MethodArgumentNotValidException`, which Spring answers with a 400,
   and the edge then turns the record into values through their
   constructors, as `oo-placing-domain-logic` rule 5 and
   `oo-crossing-system-boundaries` rules 1 and 2 ask.

   The exception is a request with several parts, such as a body and a
   file: `@Valid` on each `@RequestPart` applies Bean Validation to the
   part, the file's size and type are checked at the edge, and the
   domain's values are still built in that one place.

7. Rule. **Declare the repository the domain uses in domain types,
   importing nothing from Spring, and implement it at the edge with an
   adapter class that delegates to a Spring Data interface exposing
   only the methods the adapter needs; the generic methods of
   `JpaRepository` never reach domain code.** The domain's interface
   names the calls the domain makes, the adapter implements them in
   Spring's types, and the Spring Data interface copies only the
   methods the adapter delegates to, so a CRUD repository's complete
   set of methods stops at the edge, as
   `oo-designing-repositories` rules 1 and 2 ask.

8. Rule. **Leave non-final exactly the classes Spring or the
   persistence provider subclasses: a `@Configuration` class whose
   `proxyBeanMethods` is true, which relaxes `oo-java` rule 7; a bean
   Spring proxies through its class, which under Spring Boot's default
   (`spring.aop.proxy-target-class=true`) is any bean whose methods
   carry `@Transactional`, whether or not it implements an interface,
   which relaxes `oo-java` rule 7; and a JPA entity, which relaxes
   `oo-java` rule 7; every other class keeps that rule.** A final class
   cannot be proxied, a final method cannot be advised, a
   configuration class with `proxyBeanMethods` true needs a runtime
   subclass, and the provider requires an entity to be non-final.
   `oo-honouring-substitutability` rule 5 still asks every other class
   to be closed.

## Pattern

`RefillEligibility` decides whether a prescription may be dispensed
again, from the date it was last dispensed and the current time, within
the clinic's refill interval. It is a domain class: a rule the clinic
owns, not a bean the container describes.

Before:

```java
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RefillEligibility {
    @Autowired
    private Clock clock;

    public boolean allows(Instant lastDispensedAt) {
        return !clock.instant().isBefore(
            lastDispensedAt.plus(Duration.ofDays(28)));
    }
}
```

In the Before, `@Service` puts a stereotype on a domain class (rule 2),
and `@Autowired` on the field hides the clock from the constructor
(rule 1). Spring sets `clock` after construction, so nothing in the
class says what it needs and a half-built object can exist. The fence
stores nothing.

After:

```java
import java.time.Duration;
import java.time.Instant;

public final class RefillEligibility {
    private final Duration interval;

    public RefillEligibility(Duration interval) {
        this.interval = interval;
    }

    public boolean allows(Instant lastDispensedAt, Instant now) {
        return !now.isBefore(lastDispensedAt.plus(interval));
    }
}
```

```java
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public final class CheckRefillEligibility {
    private final Clock clock;
    private final RefillEligibility eligibility;

    public CheckRefillEligibility(
            Clock clock, RefillEligibility eligibility) {
        this.clock = clock;
        this.eligibility = eligibility;
    }

    public boolean isEligible(Instant lastDispensedAt) {
        Instant now = clock.instant();
        return eligibility.allows(lastDispensedAt, now);
    }
}
```

```java
import java.time.Clock;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RefillConfiguration {
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    RefillEligibility refillEligibility() {
        return new RefillEligibility(Duration.ofDays(28));
    }
}
```

In the After, `RefillEligibility` has no Spring annotation or import,
keeps the clinic's refill interval in a final `Duration` field, and
takes the current time as a value in `allows`, which keeps
`oo-designing-for-testability` rule 3. `CheckRefillEligibility` keeps
rule 1: it receives the clock and the domain class through one
constructor into final fields, and `isEligible` asks the clock once and
passes the answer on. `RefillConfiguration` is the composition root:
its `@Bean` methods name each object and the values or collaborator it
takes, and the domain class is built there from `Duration.ofDays(28)`,
which keeps rule 2. `RefillEligibility` and `CheckRefillEligibility`
are final, because neither is a `@Configuration` class or a bean
Spring proxies, which keeps `oo-java` rule 7. `RefillConfiguration` is
non-final because a `@Configuration` class is subclassed at startup,
which relaxes `oo-java` rule 7. None of the fences stores anything.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- `@Autowired` on a field or a setter.
- `@Service` or `@Component` on a class that holds a domain rule.
- A call to `ApplicationContext` or `BeanFactory` outside configuration.
- `@Transactional` on a repository or a domain class.
- One method of a bean calling another `@Transactional` method of the
  same object.
- A JPA entity with a setter or a public no-argument constructor.
- A mapped association to another aggregate root.
- `spring.jpa.open-in-view` left true.
- A repository interface that extends `JpaRepository` and reaches
  domain code.
- A `final` class whose methods carry `@Transactional`.
- A controller that takes a request record and passes it into the
  domain.

## Common mistakes

- Adding `@Autowired` to a class that has one constructor, where Spring
  already uses it.
- Moving a rule into a `@Service` domain class so that injection is
  convenient.
- Marking a method `@Transactional` and calling it from the same object,
  expecting a new transaction.
- Adding setters to a JPA entity because the provider needs them; field
  access needs none.
- Mapping another aggregate as an association because lazy loading
  seems to make it easy.
- Letting a `JpaRepository` become the repository type the domain
  names.
- Making a `@Configuration` class final while `proxyBeanMethods` stays
  true.
- Sending a `@RequestBody` record into the domain instead of building
  domain values at the edge.

## Related skills

- `oo-java` holds the language rules this skill applies, including rule
  7 on final classes.
- `oo-inverting-dependencies` decides how collaborators reach an object
  and where the composition root sits.
- `oo-working-within-a-framework` decides what a framework may shape and
  what stays in the domain.
- `oo-placing-domain-logic` keeps an application service to
  coordination.
- `oo-taming-persistence` sets the unit of work and keeps a lazy load
  inside its transaction.
- `oo-designing-aggregates` decides what one transaction changes and how
  aggregates refer to each other.
- `oo-encapsulating-state-and-behaviour` keeps state behind methods
  named for domain actions.
- `oo-constructing-valid-objects` makes a constructor refuse broken
  input.
- `oo-crossing-system-boundaries` gives each contract its own transfer
  types.
- `oo-designing-repositories` declares a repository in domain types.
- `oo-honouring-substitutability` decides which classes stay open.

## Further reading

- [Transactions through the proxy](references/transactions-through-the-proxy.md)
