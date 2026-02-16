from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string 
from django.utils.html import strip_tags             
from .models import SensorReading, ZoneThreshold, GreenhouseZone


@receiver(post_save, sender=SensorReading)
def check_sensor_thresholds(sender, instance, created, **kwargs):
    if not created:
        return

    # 1. Fetch thresholds for this specific zone
    threshold, _ = ZoneThreshold.objects.get_or_create(
        zone=instance.zone,
        defaults={
            'min_temp': 15.0, 'max_temp': 30.0,
            'min_humidity': 30.0, 'max_humidity': 80.0,
            'min_moisture': 40.0, 'max_moisture': 90.0
        }
    )

    alerts = []
    
    # 2. Comprehensive Logic Check
    # Temperature
    if instance.temperature > threshold.target_temp_max:
        alerts.append(f"High Temperature: {instance.temperature}°C (Max: {threshold.target_temp_max}°C)")
    elif instance.temperature < threshold.target_temp_min:
        alerts.append(f"Low Temperature: {instance.temperature}°C (Min: {threshold.target_temp_min}°C)")

    # Humidity
    if instance.humidity > threshold.target_humidity_max:
        alerts.append(f"High Humidity: {instance.humidity}% (Max: {threshold.target_humidity_max}%)")
    elif instance.humidity < threshold.target_humidity_min:
        alerts.append(f"Low Humidity: {instance.humidity}% (Min: {threshold.target_humidity_min}%)")

    # Soil Moisture
    if instance.soil_moisture > threshold.max_moisture:
        alerts.append(f"High Soil Moisture: {instance.soil_moisture}% (Max: {threshold.min_moisture}%)")
    elif instance.soil_moisture < threshold.min_moisture:
        alerts.append(f"Low Soil Moisture: {instance.soil_moisture}% (Min: {threshold.min_moisture}%)")

    # 3. Send Email if any alert triggered
    if alerts:
        subject = f"🚨 ALERT: Environmental Issue in {instance.zone.name}"
        
        context = {
            'zone_name': instance.zone.name,
            'alerts': alerts,
            'readings': {
                'temp': instance.temperature,
                'humidity': instance.humidity,
                'moisture': instance.soil_moisture,
            },
            'thresholds': threshold,
            'timestamp': instance.timestamp,
        }

        html_message = render_to_string('emails/alert.html', context)
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.ADMIN_EMAIL],
                html_message=html_message,
                fail_silently=False
            )
            print(f"✅ Alert sent for {instance.zone.name}: {', '.join(alerts)}")
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
