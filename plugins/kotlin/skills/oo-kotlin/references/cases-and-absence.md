# Cases and Absence

This file follows one arrangement through rules 3 and 4: how a visit
takes place, what the front desk prepares for it, and an interpreter
whom only some patients need. The types share one file here to keep the
example short.

```kotlin
sealed interface VisitFormat

data object InPerson : VisitFormat

data class PhoneCall(val number: String) : VisitFormat

data class VideoCall(val link: String) : VisitFormat

class VisitArrangement(
    private val format: VisitFormat,
    private val interpreterLanguage: String?,
) {
    fun preparation(): String {
        val how = when (format) {
            InPerson -> "keep a room free"
            is PhoneCall -> "call ${format.number}"
            is VideoCall -> "send ${format.link}"
        }
        val interpreter = interpreterLanguage
            ?.let { " with a $it interpreter" }
            ?: ""
        return how + interpreter
    }
}
```

- `VisitFormat` is a sealed interface, and its cases are a data object
  and two data classes, so the formats are closed where the clinic
  closes them (rule 3).
- `preparation` answers each format in a `when` expression with no
  `else` branch, and the compiler checks that every case is covered
  (rule 3).
- `interpreterLanguage` is nullable because many patients need no
  interpreter, an absence the clinic allows. `preparation` reads it with
  `?.let` and `?:`, and never asserts it with `!!` (rule 4).
- A smart cast lets `format.number` be read in the `PhoneCall` branch,
  because `format` is a `val` that nothing else can change.

## A worked change

The clinic starts offering visits by text chat, held in a thread the
patient opens from the clinic's message.

1. The team adds a data class `TextChat`, which holds the thread and
   implements `VisitFormat`.
2. The compiler rejects `preparation`, whose `when` no longer covers
   every case, and the team adds a branch for `TextChat` that answers
   "open the thread".
3. A second method, `reminder`, mentions the interpreter's language
   when there is one, and reads it with `?.let`, as `preparation` does.

The change ends with every `when` over `VisitFormat` naming all four
formats, and with no `!!` reading the interpreter's language, as rules 3
and 4 ask.
