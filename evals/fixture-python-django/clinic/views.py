from django.shortcuts import get_object_or_404, redirect

from .models import Appointment


def check_in(request, pk):
    appointment = get_object_or_404(Appointment, pk=pk)
    appointment.status = Appointment.CHECKED_IN
    appointment.save()
    return redirect("check-in", pk=pk)
