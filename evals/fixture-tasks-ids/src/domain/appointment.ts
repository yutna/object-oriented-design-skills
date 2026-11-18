export class Appointment {
  patientId: string
  start: Date
  end: Date

  constructor(patientId: string, start: Date, end: Date) {
    this.patientId = patientId
    this.start = start
    this.end = end
  }

  durationMinutes(): number {
    const startMinutes =
      this.start.getHours() * 60 + this.start.getMinutes()
    const endMinutes = this.end.getHours() * 60 + this.end.getMinutes()
    return endMinutes - startMinutes
  }
}
