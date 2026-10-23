import { Appointment } from '../domain/appointment.ts'
import { Clinician } from '../domain/clinician.ts'
import { Patient } from '../domain/patient.ts'
import { Slot } from '../domain/slot.ts'

export class MemoryStore {
  #slots: Slot[]
  #clinicians: Clinician[]
  #patients: Patient[]
  #appointments: Appointment[]

  constructor(
    slots: Slot[] = [],
    clinicians: Clinician[] = [],
    patients: Patient[] = [],
  ) {
    this.#slots = slots
    this.#clinicians = clinicians
    this.#patients = patients
    this.#appointments = []
  }

  slot(id: string): Slot {
    const slot = this.#slots.find((candidate) => candidate.id === id)
    if (slot === undefined) {
      throw new Error(`Unknown slot: ${id}`)
    }
    return slot
  }

  clinician(id: string): Clinician {
    const clinician = this.#clinicians.find((candidate) => candidate.id === id)
    if (clinician === undefined) {
      throw new Error(`Unknown clinician: ${id}`)
    }
    return clinician
  }

  patient(id: string): Patient {
    const patient = this.#patients.find((candidate) => candidate.id === id)
    if (patient === undefined) {
      throw new Error(`Unknown patient: ${id}`)
    }
    return patient
  }

  save(appointment: Appointment): void {
    this.#appointments.push(appointment)
  }
}
