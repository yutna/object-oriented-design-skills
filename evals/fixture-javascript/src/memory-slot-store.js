export class MemorySlotStore {
  #slots = new Map()

  add(slot) {
    this.#slots.set(slot.id, slot)
  }

  find(id) {
    return this.#slots.get(id)
  }

  freeFor(clinicianId, day) {
    return [...this.#slots.values()]
      .filter((slot) => slot.clinicianId === clinicianId)
      .filter((slot) => slot.isFree())
      .filter((slot) => this.#fallsOn(slot.start, day))
      .sort((left, right) => left.start - right.start)
  }

  #fallsOn(date, day) {
    return date.getFullYear() === day.getFullYear() &&
      date.getMonth() === day.getMonth() &&
      date.getDate() === day.getDate()
  }
}
