export class NumberWords {
  static #ONES = Object.freeze([
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  ])
  static #TENS = Object.freeze([
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
    'eighty', 'ninety'
  ])

  static toNumber(text) {
    const word = String(text).trim().toLowerCase()
    if (/^\d+$/.test(word)) {
      const number = Number(word)
      return number <= 99 ? number : null
    }
    const ones = NumberWords.#ONES.indexOf(word)
    if (ones !== -1) return ones
    const tens = NumberWords.#TENS.indexOf(word)
    if (tens !== -1) return tens * 10
    const parts = word.split(/[-\s]+/)
    if (parts.length !== 2) return null
    const tensIndex = NumberWords.#TENS.indexOf(parts[0])
    const onesIndex = NumberWords.#ONES.indexOf(parts[1])
    if (tensIndex < 2 || onesIndex < 1 || onesIndex > 9) return null
    return tensIndex * 10 + onesIndex
  }

  static toWords(number) {
    if (!Number.isInteger(number) || number < 0 || number > 99) {
      return String(number)
    }
    if (number < 20) return NumberWords.#ONES[number]
    const tens = Math.floor(number / 10)
    const ones = number % 10
    if (ones === 0) return NumberWords.#TENS[tens]
    return `${NumberWords.#TENS[tens]}-${NumberWords.#ONES[ones]}`
  }
}
