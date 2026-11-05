export class Slot {
  #id
  #clinicianId
  #start
  #end
  #patientId

  constructor(id, clinicianId, start, end, patientId = null) {
    this.#id = id
    this.#clinicianId = clinicianId
    this.#start = start
    this.#end = end
    this.#patientId = patientId
  }

  get id() {
    return this.#id
  }

  get clinicianId() {
    return this.#clinicianId
  }

  get start() {
    return this.#start
  }

  get end() {
    return this.#end
  }

  get patientId() {
    return this.#patientId
  }

  isFree() {
    return this.#patientId === null
  }

  reserve(patientId) {
    if (!this.isFree()) {
      throw new Error(`Slot ${this.#id} is already taken`)
    }
    this.#patientId = patientId
  }
}
