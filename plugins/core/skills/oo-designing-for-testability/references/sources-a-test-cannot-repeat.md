# Sources a test cannot repeat

A test repeats only when every value it reads is one it chose. Four
sources escape a test's choice unless the design gives it a place to
stand: the current time, a random draw, a newly generated identifier
and a setting read from the environment. Each reaches the object
through a port, and each port is answered by a stand-in in the test.

- **The current time.** The port is `Clock`, with `now(): DateTime`,
  the shape the inverting dependencies reference gives it. The test's
  stand-in answers the moment the test chose. A clinic example is
  `SendVisitReminders`, which holds a `Clock`; it sends `clock.now()` to
  `ReminderWindow` as a `DateTime`, and the window decides from that
  value whether a visit is close enough for a reminder.
- **A random draw.** The port is `RoomDraws`, with
  `nextRoom(): RoomId`. The test's stand-in answers the room it chose,
  so the test knows where a walk-in lands. `WalkInDesk` holds the port
  and asks it once when it places a walk-in visit in a room; the real
  adapter draws from all free rooms.
- **A newly generated identifier.** The port is `VisitNumbers`, with
  `next(): VisitNumber`. The test's stand-in answers the number it
  chose, so the test can find the visit it queued. `WalkInQueue` holds
  the port and gives each queued visit the number it receives.
- **A setting read from the environment.** The port is
  `ClinicSettings`, with `reminderLead(): Duration`. The test's
  stand-in answers the lead it chose, such as one day.
  `SendVisitReminders` holds the port and passes the lead to
  `ReminderWindow` as a value, so the test knows which visits are due.

A domain object that needs only a value should receive the value.
`ReminderWindow.isDue(visit, now, lead)` takes the time and the lead as
parameters, and
[modeling lifecycles](../../oo-modeling-lifecycles/SKILL.md) rule 5
gives the same shape to `recordNoShow(now)`. The use-case object asks
the port once and passes the answer on. The exception is an object that
must ask again while it handles one message, such as a long run that
checks the time between items: it holds the port.
