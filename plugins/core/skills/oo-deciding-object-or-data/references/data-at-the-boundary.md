# Data at the boundary

Some data has no rule of its own. A clinic defines its intake form in
settings, a tenant adds a field, and another system sends a payload.
This reference keeps those shapes as data and shows the one rule that
still needs a home.

## A form every clinic defines

Each clinic writes its own intake questions. A class per form would need
a deployment each time a clinic adds a question. Keep the form as two
pieces of data: the questions it asks, and the answers it has collected.

```text
value FormQuestion
  - id: QuestionId
  - prompt: String
  - required: Boolean
  + new(id: QuestionId, prompt: String, required: Boolean)

value FormAnswer
  - question: QuestionId
  - text: String
  + new(question: QuestionId, text: String)

value IntakeForm
  - questions: List<FormQuestion>
  - answers: List<FormAnswer>
  + new(questions: List<FormQuestion>, answers: List<FormAnswer>)
  + add(question: FormQuestion, text: String): IntakeForm
    raises AnswerRequired
    if question.required = true then
      if text = "" then
        raise AnswerRequired
    answer := new FormAnswer(question.id, text)
    return new IntakeForm(questions, answers.add(answer))
```

The questions are the schema the clinic defines; the answers are what the
patient supplied. Both are lists of records, so a new clinic or a new
question changes data, not a class hierarchy.

## The one rule

The form has one rule: a required question cannot be left blank. It
lives in `IntakeForm.add`, the method that accepts an answer, because
that is the only place the rule can be broken. A service that checks the
form after the fact would split the rule from the data it reads.

`add` returns a new `IntakeForm` rather than changing the old one. The
method reads `question.required`, `text`, `questions` and `answers`,
all set before the call. It adds the answer once to a new list, and the
constructor sets both fields of the new form before anything reads them.

## Records for values that are only data

`FormQuestion` and `FormAnswer` are records: they hold values, they
compare by value, and they have no rule beyond their own construction.
`IntakeForm` also starts as a record; it gains one method because one
rule needs it. That is the whole difference between plain data and a
domain object here.
