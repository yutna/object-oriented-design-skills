import { Patient } from '../domain/patient.ts'
import { loyaltyDiscount } from './discount-rules.ts'

export class Invoice {
  total(price: number, patient: Patient, on: Date): number {
    const discounts = [loyaltyDiscount(patient.visits)]
    const discount = Math.max(...discounts)
    return price * (1 - discount)
  }
}
