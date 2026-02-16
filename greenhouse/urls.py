from django.urls import path
from . import views


urlpatterns = [
    path("zones/", views.zones_list, name="zones"),
    path("thresholds/", views.thresholds_list, name="thresholds"),
    path("logs/", views.logs_list, name="logs"),
]
