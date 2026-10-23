export class QuotaPolicy {
  static DEFAULT = new QuotaPolicy(50, 75, 70, 85)

  #fiveHourStart
  #sevenDayStart
  #fiveHourContinue
  #sevenDayContinue

  constructor(fiveHourStart, sevenDayStart, fiveHourContinue,
    sevenDayContinue) {
    this.#fiveHourStart = fiveHourStart
    this.#sevenDayStart = sevenDayStart
    this.#fiveHourContinue = fiveHourContinue
    this.#sevenDayContinue = sevenDayContinue
    Object.freeze(this)
  }

  mayStart(reading) {
    // Both windows guard a new piece, so either one can hold it back.
    return reading.fiveHour < this.#fiveHourStart &&
      reading.sevenDay < this.#sevenDayStart
  }

  mayContinue(reading) {
    // A batch stops before its next piece when either window is too high.
    return reading.fiveHour < this.#fiveHourContinue &&
      reading.sevenDay < this.#sevenDayContinue
  }
}
