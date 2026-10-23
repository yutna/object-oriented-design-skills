export class Clinician {
  id: string
  workingDays: number[]

  constructor(id: string, workingDays: number[]) {
    this.id = id
    this.workingDays = workingDays
  }
}
