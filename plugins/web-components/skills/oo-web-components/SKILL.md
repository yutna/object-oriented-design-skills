---
name: oo-web-components
description: Use when a custom element that extends HTMLElement reads attributes in its constructor, exposes attributes and properties, or dispatches custom events.
license: MIT
metadata:
  version: 0.18.0
  pack: object-oriented-design-skills
---

# Designing Custom Elements

**In this pack:** sizing and rule strictness are set by the core
plugin's `oo-design` skill; each rule here keeps a core rule in this
language.

## Overview

The browser gives a custom element a lifecycle it runs itself: the
constructor, `attributeChangedCallback`, `connectedCallback` and a
shadow root that holds the element's markup. That lifecycle moves where
several of the pack's rules are kept. This skill holds only what the
platform changes on top of `oo-javascript` and `oo-typescript`; load the
one that matches the project's language too, because its rules for
`#private` state, frozen values and classes still hold. Each change
brings a shortcut that looks harmless: a constructor that reads the
attributes the browser has not given it yet, an attribute and a property
that drift apart, an element that calls the page's save function or a
store, state left on the element for any script to change, and one
element extended from another to reuse its code. The rules below close
those shortcuts with a two-step construction at the edge, one public
protocol over one private state, events instead of calls, a shadow root
that holds the markup, and composition between elements.

## When to use

- A class extends `HTMLElement` and its constructor calls
  `getAttribute`, `hasAttribute` or `setAttribute`, or writes its own
  children.
- A custom element exposes an attribute and a property for the same
  value, and the two answer differently.
- A custom element calls a function of the page, a store or a use case,
  or a page listener reads a field of the element.
- An element's state or markup is reachable from the page, or the page
  needs to restyle one part of it.
- One custom element extends another to reuse its code.
- The page must hear about a pick inside a custom element.

## When not to use

- The application is Angular: outside this skill.
- The code is JavaScript or TypeScript with no custom element:
  `oo-javascript` or `oo-typescript` covers it.
- No custom element feature bears on the question, such as which object
  owns a rule: the core skills, starting from `oo-design`.
- The code is a different framework over JavaScript or TypeScript:
  outside this skill.

## Core rules

1. Rule. **Treat a custom element as a class at the edge that the
   browser builds in two steps: the constructor calls `super()` first,
   attaches the shadow root and sets private fields, and neither reads
   nor adds attributes or children; the clinic value the element holds
   is built complete from its attributes in `attributeChangedCallback`,
   for the names `observedAttributes` lists, and the element renders or
   sends nothing that needs that value before it exists; work that the
   constructor must not do, and work that needs the element in the page,
   goes in `connectedCallback`, guarded because it can run more than
   once.**
   The platform requires of the constructor: `super()` comes first, no
   `return` other than `return` or `return this`, no `document.write` or
   `document.open`, and no inspection or addition of the element's
   attributes and children. A parsed element has its attributes when it
   upgrades, and `attributeChangedCallback` receives each observed one,
   so that hook is where text becomes the value the clinic's rules
   describe; the hook also runs when an observed attribute is added,
   changed, removed or replaced. A `connectedCallback` runs each time
   the element joins the page, and a move runs `disconnectedCallback`
   and then `connectedCallback`, so one-time work needs a private flag.
   This keeps `oo-constructing-valid-objects` rules 1 and 2 and
   `oo-working-within-a-framework` rules 1 and 2.

2. Default. **Make an observed attribute and its property one piece of
   public protocol: the property's setter checks the value and reflects
   it to the attribute, a change of the attribute sets the same private
   state, and no other state is reachable from outside.**
   The attribute is the route that markup and the page's styles read,
   and the property is the route that script writes. A setter that keeps
   the value in a field and never reflects it leaves the attribute
   showing an older value; an attribute the class does not list in
   `observedAttributes` never reaches the callback, and a callback that
   drops the new value leaves the field older than the attribute. Both
   routes run the same check through the value class and end on the one
   `#private` field: a checked value reaches both, an invalid property
   write throws before the attribute changes, and invalid markup leaves
   the element with no value.
   This keeps `oo-hiding-implementation` rules 1 and 3 and
   `oo-encapsulating-state-and-behaviour` rule 1.

   The exception is an attribute that only the page's markup writes,
   such as a name fixed for the page: the element observes it and needs
   no property, because a property would add a second route onto a value
   that has one writer.

3. Rule. **Tell the page what happened with a `CustomEvent` dispatched
   from the element, the pick in its `detail`, and `bubbles` and
   `composed` set when a listener outside the shadow root must hear it;
   the element never calls the page's functions, a store or a use case.**
   An element that calls the page's save function holds the page's job
   and cannot be used by another screen; a listener on the page holds
   the job instead, and the element states what happened in the clinic's
   words. `bubbles` carries an event dispatched on the host up to the
   page, where a listener hears it; `composed` lets the event cross a
   shadow boundary, and the event meets one only when the element sits
   inside another element's shadow root. Both default to `false`, so a
   page listener hears nothing without `bubbles`. `detail` defaults to
   `null`, so the event carries the value itself.
   This keeps `oo-separating-presentation-from-domain` rules 1 and 4 and
   `oo-inverting-dependencies` rule 2.

4. Rule. **Keep the element's state in `#private` fields and its markup
   in its shadow root, and open a part to the page's styles with `part`
   only where the page may restyle it.**
   A public field on an element is reachable from any script on the
   page, so a write to it skips the method that keeps the rule;
   `oo-javascript` rule 3 and `oo-typescript` rule 2 give the runtime's
   reason for a `#private` field. The shadow root keeps the markup out
   of the page's queries and the element's styles out of the page's
   rules; `attachShadow({ mode: 'closed' })` leaves `shadowRoot` null,
   so an element that wants the root it built keeps it in a field. A
   `part` attribute is the one hook a page's `::part()` rule can reach,
   so add it to the elements the page may restyle and no others.
   This keeps `oo-hiding-implementation` rules 1 and 3.

5. Rule. **Extend `HTMLElement` because the platform asks it, and never
   extend one custom element from another to reuse its code; share
   behaviour between elements by holding an object that has it.**
   Every custom element class answers the browser's lifecycle calls, and
   `HTMLElement` is the base the platform names for an autonomous
   element, so that `extends` is the platform's demand. An element that
   extends another inherits its lifecycle calls and its whole public
   surface, so a change to the first reaches both and a caller can treat
   one as the other; an override that works because a parent's lifecycle
   method makes an internal send breaks when the parent changes that
   send. An object held in a `#private` field offers only the methods
   the element calls, and two elements can hold the same class without
   sharing a base.
   This keeps `oo-choosing-composition-over-inheritance` rules 2 and 3.

## Pattern

`PainScale` is the clinic value the element holds: the maximum of a pain
scale, 1 to 10, built once and never changed. `PainScaleElement` is the
custom element a patient uses to rate their pain before a visit; it
shows the scale and sends the patient's pick.

Before:

`PainScaleElement` is the element in the Before. It reads `maximum` with
`getAttribute` in its constructor, writes `role` there, and sends a
click to a function of the page.

```typescript
declare function savePainScore(score: number): void

export class PainScaleElement extends HTMLElement {
  #maximum: number
  #root: ShadowRoot

  constructor() {
    super()
    this.setAttribute('role', 'group')
    this.#maximum = Number(this.getAttribute('maximum'))
    this.#root = this.attachShadow({ mode: 'open' })
    this.#root.innerHTML =
      '<button type="button">Rate your pain</button>'
    this.#root
      .querySelector('button')
      ?.addEventListener('click', () => {
        savePainScore(this.#maximum)
      })
  }
}
```

The Before breaks rule 1 twice: the constructor reads the maximum, which
a `document.createElement('pain-scale')` call has not set, and it writes
`role`, which the platform forbids. The browser refuses that
constructor: the call reports `NotSupportedError` through the page's
error event and answers an element that is not a `PainScaleElement`;
nothing is thrown to the caller. The click handler breaks rule 3,
because the element holds the page's job. The fence stores nothing and
leaves persistence out.

After:

`PainScale` is the value class: its constructor refuses a maximum
outside 1 to 10, and `Object.freeze` and the missing writer keep it.
`PainScaleElement` builds that value when the attribute arrives,
renders inside its shadow root, and dispatches the pick.

```typescript
export class PainScale {
  #maximum: number

  constructor(maximum: number) {
    if (!PainScale.accepts(maximum)) {
      throw new RangeError('a pain scale runs from 1 to 10')
    }
    this.#maximum = maximum
    Object.freeze(this)
  }

  static accepts(maximum: number): boolean {
    return Number.isInteger(maximum) && maximum >= 1 && maximum <= 10
  }

  static fromText(value: string | null): PainScale | null {
    if (value === null) return null
    const maximum = Number(value)
    return PainScale.accepts(maximum)
      ? new PainScale(maximum)
      : null
  }

  get maximum(): number {
    return this.#maximum
  }
}

export class PainScaleElement extends HTMLElement {
  static observedAttributes = ['maximum']

  #scale: PainScale | null
  #root: ShadowRoot
  #shown: boolean

  constructor() {
    super()
    this.#scale = null
    this.#shown = false
    this.#root = this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (this.#shown) return
    this.#shown = true
    this.setAttribute('role', 'group')
    this.#render()
  }

  attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    newValue: string | null
  ): void {
    this.#scale = PainScale.fromText(newValue)
    if (this.#shown) this.#render()
  }

  get maximum(): number | null {
    return this.#scale === null ? null : this.#scale.maximum
  }

  set maximum(value: number | null) {
    if (value === null) {
      this.removeAttribute('maximum')
      return
    }
    const scale = new PainScale(value)
    this.setAttribute('maximum', String(scale.maximum))
  }

  #render(): void {
    const scale = this.#scale
    if (scale === null) {
      this.#root.replaceChildren()
      return
    }
    const choices = document.createElement('div')
    choices.setAttribute('part', 'choices')
    for (let score = 0; score <= scale.maximum; score += 1) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = String(score)
      button.addEventListener('click', () => this.#pick(score))
      choices.append(button)
    }
    this.#root.replaceChildren(choices)
  }

  #pick(score: number): void {
    const scale = this.#scale
    if (scale === null || score > scale.maximum) return
    this.dispatchEvent(new CustomEvent('pain-score', {
      detail: { score },
      bubbles: true,
      composed: true
    }))
  }
}

customElements.define('pain-scale', PainScaleElement)
```

The After keeps rule 1: the constructor calls `super()` first, attaches
the shadow root and sets its fields, and reads or writes no attribute or
child; `attributeChangedCallback` builds `PainScale` when `maximum`
arrives, and nothing renders or sends before that value exists.
`connectedCallback` sets `role` and renders the first time, and `#shown`
stops that work when a move brings the element back. The After keeps
rule 3 too: `#pick` dispatches `pain-score` with the score in `detail`,
`bubbles` carries it to a listener on the page, and `composed` lets it
cross a shadow boundary if the element sits inside another element's
shadow root, so the pick is heard wherever the element is placed; the
element calls nothing of the page's. It keeps rule 4: `#scale`
and `#root` are `#private`, the buttons live in the shadow root, and
only the choices carry `part`. It keeps rule 5 because the element
holds a `PainScale` in `#scale` rather than extending a class that has
one. The name `pain-scale` starts with a lowercase alphabetic ASCII
character and holds a hyphen, as a valid custom element name must. The
element stores the scale in `#scale`, on the element in memory, under no
identity and in no transaction; the fence leaves persistence out.

## Red flags

Places to look, not verdicts. A red flag becomes a finding only with
evidence: a measurement, a reproducible bug, or a failing test.

- A constructor that calls `getAttribute`, `hasAttribute` or
  `setAttribute`, or sets `innerHTML`.
- A property whose setter never writes its attribute, an attribute
  missing from `observedAttributes`, or an `attributeChangedCallback`
  that drops the new value.
- An element that imports a use case, calls `fetch`, or calls a global
  save function.
- A public field, or a getter that hands out the shadow root.
- A `CustomEvent` without `bubbles` where a page listener must hear it,
  or without `composed` where the element sits in another shadow root.
- A class that extends another custom element.
- A `part` on every node in the shadow root, or on none where the page
  must restyle one.
- One-time work in `connectedCallback` with no flag that stops a second
  run.

## Common mistakes

- Reading attributes in the constructor because they are there in the
  parsed markup.
- Writing an attribute in the constructor to make the element look
  right before it joins the page.
- Keeping the attribute and the property in two fields and syncing them
  by hand in several places.
- Calling the page's save function from the element and calling the
  element reusable.
- Forgetting `bubbles`, so a page listener never hears the event, or
  `composed`, so a listener never hears it where the element sits in
  another element's shadow root.
- Extending a working element to reuse one method, then inheriting its
  whole public surface.
- Believing `private` in TypeScript keeps an element's field out of the
  page's reach.
- Letting a getter answer the shadow root or an internal list.

## Related skills

- `oo-design` sizes a task and defines the rule labels.
- `oo-javascript` keeps the pack's rules in plain JavaScript.
- `oo-typescript` keeps the same rules where the compiler checks them.
- `oo-constructing-valid-objects` says when an object is complete.
- `oo-working-within-a-framework` decides which platform demands the
  edge may meet.
- `oo-hiding-implementation` keeps a module's decisions behind its
  interface.
- `oo-encapsulating-state-and-behaviour` keeps a rule with the state it
  guards.
- `oo-separating-presentation-from-domain` keeps the clinic's rules out
  of the view.
- `oo-inverting-dependencies` says how collaborators arrive and where
  the graph is built.
- `oo-choosing-composition-over-inheritance` chooses holding an object
  over extending a class.

## Further reading

- [Attributes and properties](references/attributes-and-properties.md)
