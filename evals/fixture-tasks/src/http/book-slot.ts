import { Appointment } from '../domain/appointment.ts'
import { MemoryStore } from '../store/memory-store.ts'

export type BookSlotRequest = {
  slotId: string
  patientId: string
}

export function bookSlot(
  request: BookSlotRequest,
  store: MemoryStore,
): { status: number } {
  const slot = store.slot(request.slotId)
  slot.reserve(request.patientId)
  store.save(new Appointment(request.patientId, slot.start, slot.end))
  return { status: 201 }
}
