import { RepoError } from '../errors.mjs'

export class QuotaReading {
  #fiveHour
  #sevenDay
  #fiveHourResetsAt
  #sevenDayResetsAt

  static fromStreamJson(text) {
    const events = []
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue
      let event
      try {
        event = JSON.parse(line)
      } catch {
        continue
      }
      // Diagnostics share the stream, but only an event carries a reading.
      if (event?.type === 'rate_limit_event') events.push(event)
    }
    const event = events.at(-1)
    // The last event is the window state that applies to this run.
    if (event === undefined) {
      throw new RepoError('no rate_limit_event in stream-json')
    }
    const fiveHour = QuotaReading.#window(event, 'five_hour')
    const sevenDay = QuotaReading.#window(event, 'seven_day')
    // A window reports a fraction, and the queue works in whole percents.
    return new QuotaReading(
      Math.round(fiveHour.utilization * 100),
      Math.round(sevenDay.utilization * 100),
      fiveHour.resetsAt,
      sevenDay.resetsAt)
  }

  static #window(event, name) {
    const window = event?.rate_limit_info?.unifiedWindows?.[name]
    if (window === undefined ||
      !Number.isFinite(window.utilization) ||
      !Number.isFinite(window.resetsAt)) {
      throw new RepoError(
        `rate_limit_event has no usable ${name} window`)
    }
    return window
  }

  constructor(fiveHour, sevenDay, fiveHourResetsAt, sevenDayResetsAt) {
    this.#fiveHour = fiveHour
    this.#sevenDay = sevenDay
    this.#fiveHourResetsAt = fiveHourResetsAt
    this.#sevenDayResetsAt = sevenDayResetsAt
    Object.freeze(this)
  }

  get fiveHour() {
    return this.#fiveHour
  }

  get sevenDay() {
    return this.#sevenDay
  }

  get fiveHourResetsAt() {
    return this.#fiveHourResetsAt
  }

  get sevenDayResetsAt() {
    return this.#sevenDayResetsAt
  }

  equals(other) {
    // Two readings are equal when every window and reset time matches.
    return other instanceof QuotaReading &&
      other.#fiveHour === this.#fiveHour &&
      other.#sevenDay === this.#sevenDay &&
      other.#fiveHourResetsAt === this.#fiveHourResetsAt &&
      other.#sevenDayResetsAt === this.#sevenDayResetsAt
  }

  toJSON() {
    return {
      fiveHour: this.#fiveHour,
      sevenDay: this.#sevenDay,
      fiveHourResetsAt: this.#fiveHourResetsAt,
      sevenDayResetsAt: this.#sevenDayResetsAt
    }
  }
}
