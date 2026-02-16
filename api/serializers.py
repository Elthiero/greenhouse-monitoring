from rest_framework import serializers
from greenhouse.models import GreenhouseZone, ZoneThreshold, SensorReading


class ZoneThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZoneThreshold
        fields = [
            "id",
            "zone",
            "target_temp_min",
            "target_temp_max",
            "target_humidity_min",
            "target_humidity_max",
            "min_moisture",
            "max_moisture",
        ]
        # Read-only Field
        read_only_fields = ["id", "zone"]


class GreenhouseZoneSerializer(serializers.ModelSerializer):
    threshold = ZoneThresholdSerializer(read_only=True)

    class Meta:
        model = GreenhouseZone
        fields = ["id", "name", "location", "description", "threshold", "created_at"]
        read_only_fields = ["id", "created_at"]


class SensorReadingSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = SensorReading
        fields = [
            "id",
            "zone",
            "zone_name",
            "temperature",
            "humidity",
            "soil_moisture",
            "is_alert",
            "timestamp",
        ]
        read_only_fields = ["id","is_alert", "timestamp"]
