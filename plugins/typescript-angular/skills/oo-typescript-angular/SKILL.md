---
name: oo-typescript-angular
description: Use when Angular code picks providedIn or a component's providers, keeps shared state in a service with RxJS or signals, or chooses an injection token.
license: MIT
metadata:
  version: 0.19.0
  pack: object-oriented-design-skills
---

# Designing Objects in Angular

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

Angular changes three things on top of `oo-typescript` that move where
a clinic's rules are kept: an injector that decides how long a service
lives, a service that can hold shared state through RxJS or signals,
and a token that names a port at run time. This skill covers only those
changes; load `oo-typescript` too, because its rules for `#private`
state, abstract classes and the composition root still hold. Each
addition brings a shortcut that looks harmless: one screen's thread
kept in a service every screen can reach, a writable signal or
`BehaviorSubject` any component can change, a clinic rule written in a
template or a component, and a port named by an interface that does
not exist at run time. The rules below close those shortcuts
with a state service provided by the screen, a read-only view and named
methods, a domain class that owns the rule, a token that exists at run
time, and `inject()` kept to the classes Angular creates.

## When to use

- Angular code chooses between `providedIn: 'root'` and a component's
  `providers`, or a service holds state one screen owns.
- Two components share state through a service that holds a
  `BehaviorSubject` or a writable signal, or a component writes that
  state with `next` or `set`.
- A clinic rule sits in a component, a template expression or a
  service rather than in a domain class.
- A port is named by an interface or by an `InjectionToken`, or an
  adapter is wired with `useClass`.
- A class asks for collaborators with `inject()`, or a plain class
  calls `inject()` though Angular does not create it.
- You are deciding where a service's state ends, or how long an object
  that holds it should live.

## When not to use

- The code is TypeScript with no framework: `oo-typescript` answers
  the question.
- The code defines custom elements on the browser platform with no
  framework: `oo-web-components` covers it.
- No Angular feature bears on the question, such as which object owns
  a rule: the core skills, starting from `oo-design`.
- The code is a different framework over TypeScript: outside this
  skill.

## Core rules

1. Rule. **Give a service the lifetime of the state it holds: a
   service that holds one screen's state is listed in that component's
   `providers`, so each instance of the component gets its own and it
   ends with the component; a service provided for the whole
   application holds only state that belongs to the whole
   application.** Angular resolves a token in the component's own
   `ElementInjector` first and then up the component tree to the root
   `EnvironmentInjector`, so where a provider sits decides who shares
   the instance. A provider in a component's `providers` creates a new
   instance for each instance of that component, and the component's
   destruction destroys the service with it. A service the root
   injector provides is reached by every component that asks for it,
   so one screen's open thread there is shared by every screen that
   asks, and the screen that opened it does not own it. This keeps
   `oo-managing-shared-state` rule 2 and
   `oo-encapsulating-state-and-behaviour` rule 1.

2. Rule. **Let only the service that holds a piece of shared state
   change it: keep the `BehaviorSubject` or writable signal in a
   `#private` field, hand out `asObservable()` or `asReadonly()`, put
   immutable values in it, and change it through methods named for
   what the user did.** A `BehaviorSubject` emits its current value to
   each subscriber and offers `next`, and a writable signal offers
   `set` and `update`; a caller that receives either can change the
   state without the service's rule. `asObservable()` and
   `asReadonly()` return a view with no writer, and a readonly signal
   cannot be changed with `set()` or `update()`. A readonly signal
   does not prevent deep mutation of its value, so the value it holds
   is immutable and a change builds a new one. This keeps
   `oo-managing-shared-state` rules 1 and 2,
   `oo-encapsulating-state-and-behaviour` rules 2 and 5, and
   `oo-typescript` rule 2.

3. Rule. **Keep every clinic rule in a domain class that imports
   nothing from Angular; a component or service asks it, and no
   template expression or component method decides it.** A component
   method or a template expression that decides who may reply keeps a
   copy of the rule where only a test that builds the component can
   reach it, and a second screen repeats the copy. The domain class
   holds the rule and answers a question such as whether an author may
   reply; the component or the service asks it with the values the
   answer depends on and shows the answer. Because the class imports
   nothing from `@angular/core`, a test builds it with plain objects
   and no test bed. This keeps
   `oo-separating-presentation-from-domain` rules 1 and 4 and
   `oo-working-within-a-framework` rule 1.

4. Default. **Inject a port through a token that exists at run time:
   declare the port the domain needs as an abstract class and provide
   its adapter with `useClass`, or keep it an interface and give it an
   `InjectionToken`; never name an interface as a token.** TypeScript
   erases an interface from the JavaScript output, so Angular has no
   value to use as the token and the compiler refuses the name; an
   abstract class stays in the output and can be the token, and
   `InjectionToken` creates an object that names an interface's port
   at run time. `useClass` gives the token a class to build, so the
   domain asks for the port and the application names the adapter
   once. `oo-typescript` rule 3 leaves the choice between an interface
   and an abstract class to judgement; this rule settles that choice
   for Angular tokens. This keeps `oo-inverting-dependencies` rules 1
   and 2 and `oo-typescript` rule 3.

   The exception is a port whose adapter a factory builds from
   configuration, such as a client that needs a base address: declare
   the `InjectionToken` in the application's wiring, never in the domain
   file, and give it a `useFactory` that builds the client answering
   the port; no adapter class is needed.

5. Rule. **Call `inject()` only in a class Angular creates, where an
   injection context runs, and hand collaborators to domain classes
   through their constructors, never through `inject()`.** An
   injection context exists while Angular constructs a class it
   creates and in the field initializers of that class; Angular also
   runs a provider's `useFactory` and an `InjectionToken` factory in
   one. A call outside an injection context, such as one in a method
   that runs after construction, throws. A domain class is built by
   the application or by a test, so it takes each collaborator as a
   constructor parameter and needs no injector. An Angular-created
   component or service may use `inject()` or constructor parameters;
   a plain class receives every collaborator through its constructor.
   This keeps `oo-inverting-dependencies` rules 2 and 5 and
   `oo-working-within-a-framework` rule 2.

## Pattern

`MessageThread` is the thread a patient and the clinic exchange: its
identifier, subject, patient, assigned clinician, whether it accepts
replies, and its replies. Every field is read only, the reply list is
copied in the constructor, and no method changes the object, so a state
service that holds it holds a value that cannot change.

```typescript
export class ThreadReply {
  constructor(
    readonly authorName: string,
    readonly text: string
  ) {
    Object.freeze(this)
  }
}

export class MessageThread {
  #replies: readonly ThreadReply[]

  constructor(
    readonly id: string,
    readonly subject: string,
    readonly patientId: string,
    readonly clinicianId: string,
    readonly acceptsReplies: boolean,
    replies: readonly ThreadReply[]
  ) {
    this.#replies = Object.freeze([...replies])
    Object.freeze(this)
  }

  get replies(): readonly ThreadReply[] {
    return this.#replies
  }
}
```

Before:

`ThreadFeed` is the service in the Before. It is provided in the root
injector and holds the thread one screen shows in a public
`BehaviorSubject`, so every component can write it.

```typescript
import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { MessageThread } from './message-thread'

@Injectable({ providedIn: 'root' })
export class ThreadFeed {
  readonly thread = new BehaviorSubject<MessageThread | null>(null)
}
```

`ThreadScreenComponent` takes the feed through its constructor and
calls `next` on the public subject. The Before stores the thread in the
root service's subject, in one slot and in no transaction; the fences
leave persistence out.

```typescript
import { Component } from '@angular/core'
import { MessageThread } from './message-thread'
import { ThreadFeed } from './thread-feed'

@Component({
  selector: 'app-thread-screen',
  template: '<h2>{{ feed.thread.value?.subject }}</h2>',
})
export class ThreadScreenComponent {
  constructor(readonly feed: ThreadFeed) {}

  open(thread: MessageThread): void {
    this.feed.thread.next(thread)
  }
}
```

The Before breaks rule 1: one screen's thread sits in a service the
root injector provides, so every screen that asks shares it and the
screen that opened it does not own it. It also breaks rule 2: the
subject is public, so any component writes it with `next` and no
method of the service keeps the rule.

After:

`ThreadScreenState` is listed in the component's `providers`, keeps its
writable signal in a `#private` field, hands out `asReadonly()`, and
changes the state only through `open` and `close`, named for what the
user did.

```typescript
import { Injectable, signal } from '@angular/core'
import { MessageThread } from './message-thread'

@Injectable()
export class ThreadScreenState {
  #thread = signal<MessageThread | null>(null)
  readonly thread = this.#thread.asReadonly()

  open(thread: MessageThread): void {
    this.#thread.set(thread)
  }

  close(): void {
    this.#thread.set(null)
  }
}
```

`ThreadScreenComponent` lists `ThreadScreenState` in its `providers`
and asks it for the thread. The After stores the open thread in the
screen's own state, under the thread's identifier inside the value, in
memory and in no transaction; the fences leave persistence out.

```typescript
import { Component, inject } from '@angular/core'
import { MessageThread } from './message-thread'
import { ThreadScreenState } from './thread-screen-state'

@Component({
  selector: 'app-thread-screen',
  providers: [ThreadScreenState],
  template: '<h2>{{ state.thread()?.subject }}</h2>',
})
export class ThreadScreenComponent {
  readonly state = inject(ThreadScreenState)

  open(thread: MessageThread): void {
    this.state.open(thread)
  }
}
```

The After keeps rule 1: the state service is in the component's
`providers`, so each instance of the screen gets its own state service
and the state service ends with the screen. It keeps rule 2 as well:
the writable signal is `#private`, the component reads `asReadonly()`,
the value it holds is immutable, and `open` and `close` are the only
writers. The state service receives a thread through `open` and never a
component.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A service marked `providedIn: 'root'` that holds the thread one
  screen shows, or any state a single screen owns.
- A component that calls `next` on a service's `BehaviorSubject` or
  `set` on its writable signal.
- A getter that returns the service's writable subject or writable
  signal rather than a read-only view.
- A field marked with TypeScript's `private` where a rule guards it,
  rather than `#private`.
- A template expression or component method that decides who may
  reply to a thread.
- A port used as a token while it is still an interface.
- `inject()` in a plain class, or in a method that runs after
  construction.
- A `useValue` object literal, or a function that stands in for the
  adapter itself, where the application wires a port to its adapter.

## Common mistakes

- Providing a screen's state service in the root injector because two
  screens may show the same thread.
- Handing out the writable signal and asking callers not to call
  `set`.
- Keeping a mutable list or object in the signal and changing it in
  place.
- Putting the rule in the component because the domain class would
  otherwise need an import.
- Declaring the port as an interface and casting it to a token to
  quiet the compiler.
- Calling `inject()` in a domain class's constructor or method.
- Naming the adapter in the component that uses the port instead of in
  the one place that wires it.
- Calling `asReadonly()` and believing it freezes the value it holds.

## Related skills

- `oo-typescript` supplies the TypeScript language rules this skill
  builds on.
- `oo-web-components` covers a custom element, with the attributes,
  properties and events it exposes.
- `oo-managing-shared-state` gives changing state one owner.
- `oo-encapsulating-state-and-behaviour` keeps a rule with the state
  it guards.
- `oo-separating-presentation-from-domain` weighs what a screen knows
  and keeps clinic rules behind the domain.
- `oo-inverting-dependencies` chooses how collaborators arrive and
  where the object graph is built.
- `oo-working-within-a-framework` judges how much of a framework's
  shape to follow.
- `oo-designing-interfaces` shapes a port around its caller and
  chooses an interface or an abstract class.
- `oo-design` sizes a task and defines the rule labels.

## Further reading

- [Tokens for ports](references/tokens-for-ports.md)
