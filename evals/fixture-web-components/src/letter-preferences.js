export class LetterPreferences {
  #endpoint

  constructor(endpoint) {
    this.#endpoint = endpoint
  }

  async save(patientId, format) {
    await fetch(`${this.#endpoint}/patients/${patientId}/letter-format`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ format })
    })
  }
}
