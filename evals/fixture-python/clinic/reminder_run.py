from clinic.email_sender import EmailSender


class ReminderRun:
    def __init__(self, sender: EmailSender) -> None:
        self.sender: EmailSender = sender

    def run(self, reminders: list[tuple[str, str]]) -> int:
        sent = 0
        for address, text in reminders:
            self.sender.send(address, text)
            sent += 1
        return sent
