import { LetterPreferences } from './letter-preferences.js'

const preferences = new LetterPreferences('/api')
const main = document.querySelector('main')
const patientId = main.dataset.patientId

console.log(`settings for ${patientId}`, preferences)
