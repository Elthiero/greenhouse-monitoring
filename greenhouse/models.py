from django.db import models, transaction


class GreenhouseZone(models.Model):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """
        Optimization: Wrapped in atomic transaction to ensure
        we don't create a Zone without a Threshold if an error occurs.
        """
        is_new = self.pk is None

        # Atomic ensures database integrity: either both save, or neither saves.
        with transaction.atomic():
            super().save(*args, **kwargs)
            if is_new:
                ZoneThreshold.objects.create(zone=self)


class ZoneThreshold(models.Model):
    zone = models.OneToOneField(
        GreenhouseZone, on_delete=models.CASCADE, related_name="threshold"
    )

    target_temp_min = models.FloatField(default=20.0, null=False, blank=False)
    target_temp_max = models.FloatField(default=30.0, null=False, blank=False)
    target_humidity_min = models.FloatField(default=40.0, null=False, blank=False)
    target_humidity_max = models.FloatField(default=70.0, null=False, blank=False)
    min_moisture = models.FloatField(default=40.0, null=False, blank=False)
    max_moisture = models.FloatField(default=80.0, null=False, blank=False)

    def __str__(self):
        return f"Thresholds for {self.zone.name}"


class SensorReading(models.Model):
    zone = models.ForeignKey(
        GreenhouseZone, on_delete=models.CASCADE, related_name="readings"
    )
    temperature = models.FloatField(null=False, blank=False)
    humidity = models.FloatField(null=False, blank=False)
    soil_moisture = models.FloatField(null=False, blank=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_alert = models.BooleanField(default=False, editable=False)
    
    def save(self, *args, **kwargs):
        # Check thresholds automatically before saving
        if hasattr(self.zone, 'threshold'):
            t = self.zone.threshold
            self.is_alert = (
                self.temperature < t.target_temp_min or 
                self.temperature > t.target_temp_max or
                self.humidity < t.target_humidity_min or 
                self.humidity > t.target_humidity_max or
                self.soil_moisture < t.min_moisture or 
                self.soil_moisture > t.max_moisture
            )
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=["zone", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.zone.name} - {self.timestamp}"
