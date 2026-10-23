export class Patient {
  id: string
  birthDate: Date
  visits: number

  constructor(id: string, birthDate: Date, visits = 0) {
    this.id = id
    this.birthDate = birthDate
    this.visits = visits
  }

  ageOn(date: Date): number {
    let age = date.getFullYear() - this.birthDate.getFullYear()
    const month = date.getMonth() - this.birthDate.getMonth()
    const beforeBirthday =
      month < 0 ||
      (month === 0 && date.getDate() < this.birthDate.getDate())
    if (beforeBirthday) {
      age -= 1
    }
    return age
  }
}
