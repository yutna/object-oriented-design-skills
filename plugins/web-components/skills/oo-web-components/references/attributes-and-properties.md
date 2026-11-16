# Attributes and Properties

The maximum of the pain scale is the element's public protocol: markup
writes `maximum` as an attribute, and the page's script writes it as a
property. This reference starts with the two routes keeping two states,
then changes them to one `#private` state behind both, checked by the
`PainScale` value class of the Pattern. The element in these fences is a
smaller `PainScaleElement` than the Pattern's: it carries only the
maximum protocol, with a render in the After, and leaves the buttons,
the event and the guarded first render to the Pattern. The After has the
Pattern's `#scale` and `#root` fields, and its constructor does the same
work for them; the `#shown` field is left out.

## Before

`PainScaleElement` is the element in the Before. The property writes
`#maximum` and never reflects it to the attribute, and the class lists
no `observedAttributes`, so a change of the attribute never reaches
`#maximum`.

```javascript
export class PainScaleElement extends HTMLElement {
  /** @type {number} */
  #maximum

  constructor() {
    super()
    this.#maximum = 10
    this.attachShadow({ mode: 'open' })
  }

  /** @returns {number} */
  get maximum() {
    return this.#maximum
  }

  /** @param {number} value */
  set maximum(value) {
    this.#maximum = value
  }
}

customElements.define('pain-scale', PainScaleElement)

const scale = new PainScaleElement()
scale.maximum = 4
scale.setAttribute('maximum', '8')
```

After those writes, `scale.maximum` answers `4` and
`scale.getAttribute('maximum')` answers `'8'`: the page holds two
states, and neither route informs the other. The fence stores nothing
and leaves persistence out.

## After

`PainScale` is the value class of the Pattern. It refuses a maximum
outside 1 to 10, and it is the one place that checks a value from either
route. `PainScaleElement` observes `maximum`, keeps the value in
`#scale`, and renders from it.

```javascript
export class PainScale {
  /** @type {number} */
  #maximum

  /** @param {number} maximum */
  constructor(maximum) {
    if (!PainScale.accepts(maximum)) {
      throw new RangeError('a pain scale runs from 1 to 10')
    }
    this.#maximum = maximum
    Object.freeze(this)
  }

  /**
   * @param {number} maximum
   * @returns {boolean}
   */
  static accepts(maximum) {
    return Number.isInteger(maximum) && maximum >= 1 && maximum <= 10
  }

  /**
   * @param {string | null} value
   * @returns {PainScale | null}
   */
  static fromText(value) {
    if (value === null) return null
    const maximum = Number(value)
    return PainScale.accepts(maximum)
      ? new PainScale(maximum)
      : null
  }

  /** @returns {number} */
  get maximum() {
    return this.#maximum
  }
}

export class PainScaleElement extends HTMLElement {
  static observedAttributes = ['maximum']

  /** @type {PainScale | null} */
  #scale

  /** @type {ShadowRoot} */
  #root

  constructor() {
    super()
    this.#scale = null
    this.#root = this.attachShadow({ mode: 'open' })
  }

  /**
   * @param {string} _name
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(_name, _oldValue, newValue) {
    this.#scale = PainScale.fromText(newValue)
    this.#render()
  }

  /** @returns {number | null} */
  get maximum() {
    return this.#scale === null ? null : this.#scale.maximum
  }

  /** @param {number | null} value */
  set maximum(value) {
    if (value === null) {
      this.removeAttribute('maximum')
      return
    }
    const scale = new PainScale(value)
    this.setAttribute('maximum', String(scale.maximum))
  }

  #render() {
    const scale = this.#scale
    if (scale === null) {
      this.#root.replaceChildren()
      return
    }
    const label = document.createElement('p')
    label.textContent = `Pain from 0 to ${scale.maximum}`
    this.#root.replaceChildren(label)
  }
}

customElements.define('pain-scale', PainScaleElement)

const scale = new PainScaleElement()
scale.maximum = 8
scale.setAttribute('maximum', '4')
```

After the property write, the attribute shows `'8'`; after the
attribute write, `scale.maximum` answers `4`. Both writes check through
`PainScale` and end on `#scale`, so the attribute and the element's
state agree on the value, and no other state is reachable from outside.
The fence stores the scale in `#scale`, on the element in memory, under
no identity and in no transaction; the fence leaves persistence out.
That state keeps rule 2.
