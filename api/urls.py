from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GreenhouseZoneViewSet, SensorReadingViewSet, ZoneThresholdViewSet


router = DefaultRouter()
router.register(r"zones", GreenhouseZoneViewSet)
router.register(r"readings", SensorReadingViewSet)
router.register(r"thresholds", ZoneThresholdViewSet)

urlpatterns = [
    path("", include(router.urls)),
]