from django.db import models


class Appointment(models.Model):
    BOOKED = "booked"
    CHECKED_IN = "checked_in"
    STATUSES = [(BOOKED, "Booked"), (CHECKED_IN, "Checked in")]

    patient_name = models.CharField(max_length=200)
    starts_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUSES, default=BOOKED)
