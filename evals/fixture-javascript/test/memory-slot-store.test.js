import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MemorySlotStore } from '../src/memory-slot-store.js'
import { Slot } from '../src/slot.js'

const day = new Date(2026, 10, 6)
const morning = new Date(2026, 10, 6, 9)
const noon = new Date(2026, 10, 6, 12)
const afternoon = new Date(2026, 10, 6, 14)
const evening = new Date(2026, 10, 6, 16)
const tomorrow = new Date(2026, 10, 7, 9)

function storeWith(...slots) {
  const store = new MemorySlotStore()
  for (const slot of slots) {
    store.add(slot)
  }
  return store
}

test('add keeps a slot under its id', () => {
  const slot = new Slot('slot-1', 'clinician-1', morning, noon)
  const store = storeWith(slot)

  assert.equal(store.find('slot-1'), slot)
})

test('find answers undefined for an unknown id', () => {
  const store = new MemorySlotStore()

  assert.equal(store.find('slot-1'), undefined)
})

test("freeFor lists one clinician's free slots of the day by start", () => {
  const late = new Slot('slot-late', 'clinician-1', afternoon, evening)
  const taken = new Slot(
    'slot-taken', 'clinician-1', morning, noon, 'patient-1')
  const early = new Slot('slot-early', 'clinician-1', morning, noon)
  const colleague = new Slot('slot-colleague', 'clinician-2', morning, noon)
  const later = new Slot('slot-later', 'clinician-1', tomorrow, tomorrow)
  const store = storeWith(late, taken, early, colleague, later)

  assert.deepEqual(
    store.freeFor('clinician-1', day).map((slot) => slot.id),
    ['slot-early', 'slot-late'])
})
