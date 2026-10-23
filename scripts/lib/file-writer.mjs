import { writeFileSync } from 'node:fs'

export class FileWriter {
  write(path, text) {
    writeFileSync(path, text)
  }
}
