export class Clock {
  constructor() {
    Object.freeze(this)
  }

  now() {
    return new Date()
  }

  hhmm(epochSeconds) {
    // The reset time is shown on the reader's own wall clock.
    const date = new Date(epochSeconds * 1000)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
}
