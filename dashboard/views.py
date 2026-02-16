from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from greenhouse.models import GreenhouseZone, SensorReading
from django.db.models import Subquery, OuterRef, Count
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict


# Create your views here.
def dashboard(request):
    return render (request, "dashboard.html")

def zone_chart_data(request, zone_id):
    """
    Custom endpoint for Chart.js data.
    Usage: /chart-data/1/
    """
    zone = get_object_or_404(GreenhouseZone, pk=zone_id)

    # Logic: Get last 24 readings, reverse them for the chart
    readings = zone.readings.order_by("-timestamp")[:24]
    readings = reversed(readings)

    data = {"labels": [], "temperature": [], "humidity": [], "soil_moisture": []}

    for r in readings:
        local_time = timezone.localtime(r.timestamp)
        data["labels"].append(local_time.strftime("%H:%M"))
        data["temperature"].append(r.temperature)
        data["humidity"].append(r.humidity)
        data["soil_moisture"].append(r.soil_moisture)

    return JsonResponse(data)


def top_moisture_chart(request):
    # 1. Prepare a subquery to get the latest moisture for a specific zone
    newest_reading = SensorReading.objects.filter(
        zone=OuterRef('pk')
    ).order_by('-timestamp')

    # 2. Annotate each zone with its latest moisture in ONE query
    zones = GreenhouseZone.objects.annotate(
        current_moisture=Subquery(newest_reading.values('soil_moisture')[:1])
    ).filter(current_moisture__isnull=False).order_by('-current_moisture')[:10]

    return JsonResponse({
        "labels": [z.name for z in zones],
        "data": [z.current_moisture for z in zones],
    })


def daily_alerts_chart(request):
    today = timezone.now().date()
    seven_days_ago = today - timedelta(days=6)

    # Database does all the work in milliseconds
    """"
    SELECT 
        DATE_TRUNC('day', timestamp) AS day,
        COUNT(id) AS count
    FROM sensorreading_table
    WHERE timestamp >= 'seven_days_ago_date'
        AND is_alert = TRUE
    GROUP BY day
    ORDER BY day ASC;
    """
    daily_stats = (
        SensorReading.objects
        .filter(timestamp__date__gte=seven_days_ago, is_alert=True)
        .annotate(day=TruncDay('timestamp'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )

    # Format for Chart.js
    data_map = {item['day'].strftime('%a'): item['count'] for item in daily_stats}
    
    # Fill in missing days with 0
    labels = []
    counts = []
    for i in range(7):
        day_label = (seven_days_ago + timedelta(days=i)).strftime("%a")
        labels.append(day_label)
        counts.append(data_map.get(day_label, 0))

    return JsonResponse({"labels": labels, "data": counts})