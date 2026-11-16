# Tokens for Ports

The clinic's thread feature needs its message service to load a thread
and post a reply. The port that names that service is where Angular's
token rules decide whether the code compiles at all: an interface has
no run-time value, so Angular cannot use it as a token. This reference
starts with the port declared as an interface and injected by its
name, then changes it to an abstract class provided with `useClass`,
and puts the rule about who may reply in a domain class that imports
nothing from Angular.

- [Before](#before)
- [After](#after)
- [The state it ends in](#the-state-it-ends-in)

## Before

`ThreadPort` is an interface: it names what the screen needs from the
message service and leaves the service's class to the edge.

```typescript
import { MessageThread } from './message-thread'

export interface ThreadPort {
  load(threadId: string): Promise<MessageThread>

  post(
    threadId: string,
    authorName: string,
    text: string
  ): Promise<MessageThread>
}
```

`ThreadLoader` is a service Angular creates. It calls `inject` with the
interface, because the interface is the port's name. The compiler
refuses the call: `ThreadPort` names a type and has no value in the
JavaScript output, so there is nothing Angular can use as a token.

```typescript
import { Injectable, inject } from '@angular/core'
import { MessageThread } from './message-thread'
import { ThreadPort } from './thread-port'

@Injectable({ providedIn: 'root' })
export class ThreadLoader {
  #port = inject(ThreadPort)

  load(threadId: string): Promise<MessageThread> {
    return this.#port.load(threadId)
  }
}
```

## After

`ThreadPort` is now an abstract class. It still names the port, and it
exists in the JavaScript output, so Angular can use it as the token.

```typescript
import { MessageThread } from './message-thread'

export abstract class ThreadPort {
  abstract load(threadId: string): Promise<MessageThread>

  abstract post(
    threadId: string,
    authorName: string,
    text: string
  ): Promise<MessageThread>
}
```

`ThreadLoader` is the Before's class, byte for byte; it compiles now
because the name it injects has a run-time value.

```typescript
import { Injectable, inject } from '@angular/core'
import { MessageThread } from './message-thread'
import { ThreadPort } from './thread-port'

@Injectable({ providedIn: 'root' })
export class ThreadLoader {
  #port = inject(ThreadPort)

  load(threadId: string): Promise<MessageThread> {
    return this.#port.load(threadId)
  }
}
```

`MessageAuthor` is one person who may write in a thread: a patient or
a clinician, never both. Its constructor refuses the combination that
names both or neither.

```typescript
export class MessageAuthor {
  #patientId: string | null
  #clinicianId: string | null

  constructor(
    readonly name: string,
    patientId: string | null,
    clinicianId: string | null
  ) {
    if ((patientId === null) === (clinicianId === null)) {
      throw new Error('an author is a patient or a clinician')
    }
    this.#patientId = patientId
    this.#clinicianId = clinicianId
    Object.freeze(this)
  }

  get patientId(): string | null {
    return this.#patientId
  }

  get clinicianId(): string | null {
    return this.#clinicianId
  }
}
```

`ReplyPolicy` is the domain class that decides who may reply. It
imports nothing from Angular: only the patient on the thread, or the
clinician the thread is assigned to, may reply, and a closed thread
takes no reply.

```typescript
import { MessageAuthor } from './message-author'
import { MessageThread } from './message-thread'

export class ReplyPolicy {
  allows(thread: MessageThread, author: MessageAuthor): boolean {
    if (!thread.acceptsReplies) return false
    if (author.patientId !== null) {
      return author.patientId === thread.patientId
    }
    return author.clinicianId === thread.clinicianId
  }
}
```

`PostReply` is a plain use case. It receives the port and the policy
through its constructor, asks the policy, and only then asks the port
to post the reply. The clinic's message service stores the reply under
the thread's identifier and refuses a post made against a thread that
was closed or reassigned since the policy read it: it checks the
thread's version, and the fence leaves that check, the adapter's code
and its transaction out. No fence needs the current time.

```typescript
import { MessageAuthor } from './message-author'
import { MessageThread } from './message-thread'
import { ReplyPolicy } from './reply-policy'
import { ThreadPort } from './thread-port'

export class PostReply {
  #port: ThreadPort
  #policy: ReplyPolicy

  constructor(port: ThreadPort, policy: ReplyPolicy) {
    this.#port = port
    this.#policy = policy
  }

  async post(
    thread: MessageThread,
    author: MessageAuthor,
    text: string
  ): Promise<MessageThread> {
    if (!this.#policy.allows(thread, author)) {
      throw new Error('this author may not reply to the thread')
    }
    return this.#port.post(thread.id, author.name, text)
  }
}
```

`main.ts` is the one place that names the adapter. It provides the
abstract class with `useClass`, so a component or a service that asks
for `ThreadPort` receives `ClinicMessageClient`; the adapter's code is
outside this fence.

```typescript
import { bootstrapApplication } from '@angular/platform-browser'
import { ClinicMessageClient } from './clinic-message-client'
import { ThreadPort } from './thread-port'
import { ThreadScreenComponent } from './thread-screen.component'

bootstrapApplication(ThreadScreenComponent, {
  providers: [{ provide: ThreadPort, useClass: ClinicMessageClient }],
}).catch((error: unknown) => console.error(error))
```

`ThreadScreenComponent` is the Pattern's After, with the same store and
the same fields.

## The state it ends in

The port is an abstract class that Angular can use as a token, the
adapter is named once with `useClass`, and the rule about who may reply
lives in `ReplyPolicy`, which imports nothing from Angular. That state
keeps rule 4: the port is injected through a token that exists at run
time, and the application provides its adapter with `useClass`.
