# Callbacks to Use Cases

This file follows rule 2 through one use case: a patient asks the clinic
to call them back, and the request also creates a task for the desk and
sends the patient a text. The first version does both in callbacks on
the model, inside the save. The change takes both effects out of the
callbacks and puts them in the use case's path: the use case calls the
request's task step in the same transaction as the request, and the text
goes out after that transaction has committed, through
`transaction.after_commit`.

## The model as it is

```ruby
class ReturnCallRequest < ApplicationRecord
  after_create :create_return_call_task
  after_create :send_confirmation

  private

  def create_return_call_task
    ReturnCallTask.create!(
      return_call_request_id: id,
      due_at: requested_at + 3600)
  end

  def send_confirmation
    TextMessages.new.confirm(patient_id, requested_at)
  end
end

class ReturnCallTask < ApplicationRecord
end
```

`ReturnCallRequest` is the Active Record model for the request, with
`patient_id` and `requested_at` columns, and `ReturnCallTask` is the
desk's row, with `return_call_request_id` and `due_at` columns.
`after_create` runs both callbacks after the request row is inserted but
while the save's transaction is open. `create_return_call_task` stores a
task under the request's id, and `send_confirmation` builds a sender and
sends before the commit. If a
later step rolls the save back, the task goes with it and the text has
already gone out. The fence stores a request row under its id and a task
row under that request's id, in the clinic's database, inside the
transaction Active Record wraps around the save, and sends the text
inside that transaction.

## The use case after the change

```ruby
class ReturnCallRequest < ApplicationRecord
  def plan_return_call(at:)
    ReturnCallTask.create!(
      return_call_request_id: id,
      due_at: at + 3600)
  end
end

class ReturnCallTask < ApplicationRecord
end
```

Both models keep their columns and hold no callback. The fence shows the
two models in one file for reading. A save of either stores its row
under its id in its own table, inside the transaction the caller opens.
`ReturnCallTask` is one row inside the request's aggregate, one task for
one request, so the use case creates one aggregate and changes no
existing one. `plan_return_call` is the root's message that stores the
task, and `RequestReturnCall` calls it itself; a save of the request
triggers neither effect.

```ruby
class RequestReturnCall
  def initialize(texts)
    @texts = texts
  end

  def call(patient_id:, at:)
    ReturnCallRequest.transaction do |transaction|
      request = ReturnCallRequest.create!(
        patient_id: patient_id,
        requested_at: at)
      request.plan_return_call(at: at)
      transaction.after_commit do
        @texts.confirm(patient_id, at)
      end
      request
    end
  end
end
```

`RequestReturnCall` is the use case: a plain Ruby object that receives the
clinic's `TextMessages` sender through its constructor and never builds
it. `call` opens one transaction; inside it `ReturnCallRequest.create!`
stores a request under the id the database assigns, and
`request.plan_return_call` stores a task under that request's id, both in
the clinic's database. `transaction.after_commit` registers the send on
that transaction, so `@texts.confirm` runs only after the transaction
commits. If the transaction rolls back, neither row is stored and the
block does not run. If the send fails after the commit, the request and
the task stay stored and the call fails with the sender's error. The
state keeps rule 2: the use case calls both effects, and the text waits
for the commit.
