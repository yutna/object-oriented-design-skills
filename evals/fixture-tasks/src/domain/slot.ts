export class Slot {
  id: string
  clinicianId: string
  start: Date
  end: Date
  private patientId: string | null

  constructor(id: string, clinicianId: string, start: Date, end: Date) {
    this.id = id
    this.clinicianId = clinicianId
    this.start = start
    this.end = end
    this.patientId = null
  }

  reserve(patientId: string): void {
    this.patientId = patientId
  }
}
