from django.contrib import admin
from .models import GreenhouseZone, ZoneThreshold, SensorReading


@admin.register(GreenhouseZone)
class GreenhouseZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "created_at")
    search_fields = ("name", "location")
    list_filter = ("created_at",)
    read_only_fields = ("created_at",)


@admin.register(ZoneThreshold)
class ZoneThresholdAdmin(admin.ModelAdmin):
    list_display = (
        "zone",
        "target_temp_min",
        "target_temp_max",
        "target_humidity_min",
        "target_humidity_min",
        "min_moisture",
        "max_moisture",
    )
    list_filter = ("zone",)
    search_fields = ("zone__name",)
    read_only_fields = ("zone")


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ("zone", "temperature", "humidity", "soil_moisture", "is_alert","timestamp")
    list_filter = ("zone", "timestamp")
    read_only_fields = ("is_alert", "zone", "timestamp")
    # Optimization: prevents loading all logs to count them on the main page
    show_full_result_count = False
