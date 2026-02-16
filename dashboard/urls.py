from django.urls import path
from . import views


urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    # 1. Line Charts (Specific Zone Data)
    # Matches JS: fetch(`/chart-data/zone/${currentZoneId}/`)
    path('chart-data/zone/<int:zone_id>/', views.zone_chart_data, name='zone-chart-data'),

    # 2. Bar Chart (Top 10 Soil Moisture)
    # Matches JS: fetch('/chart-data/top-moisture/')
    path('chart-data/top-moisture/', views.top_moisture_chart, name='top-moisture-chart'),

    # 3. Bar Chart (Daily Alerts)
    # Matches JS: fetch('/chart-data/daily-alerts/')
    path('chart-data/daily-alerts/', views.daily_alerts_chart, name='daily-alerts-chart'),
]
