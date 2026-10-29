# Patterns beyond objects

The application patterns this pack treats live in the skills that own
them, such as [designing
repositories](../../oo-designing-repositories/SKILL.md) and [publishing
domain events](../../oo-publishing-domain-events/SKILL.md); this reference
lists none of them.

The patterns below are outside this skill. They arrange messages between
systems or keep a system up when a dependency fails.

## Messages between systems

A channel, publish and subscribe, request and reply, competing
consumers, an idempotent receiver, a dead-letter channel and a message
translator each starts from one symptom at the edge of the clinic.

|Pattern|Clinic symptom|
|---|---|
|A channel|A lab result leaves without the sender naming the lab.|
|Publish and subscribe|Billing hears of a cancellation without being named.|
|Request and reply|Booking waits for an insurer's answer before it finishes.|
|Competing consumers|Several senders work one reminder queue, each sent once.|
|An idempotent receiver|A repeated message changes nothing the second time.|
|A dead-letter channel|A message no handler can process is kept for a person.|
|A message translator|A partner's `encounter` becomes the clinic's visit.|

Each row names the problem once. None of these messages is this skill's
to decide.

## When a dependency fails

A failing dependency is a different problem. A timeout bounds the wait
for an answer; retries ask again after a failure that may pass; a
circuit breaker stops asking a dependency that keeps failing and tries
again later; a bulkhead keeps one slow dependency from using every
worker. Those patterns are named once here and left outside this skill.
