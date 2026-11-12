from django.urls import path

from . import views

urlpatterns = [
    path("appointments/<int:pk>/check-in/", views.check_in, name="check-in"),
]
