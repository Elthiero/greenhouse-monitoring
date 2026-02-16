from rest_framework import viewsets, status
from rest_framework.response import Response
from greenhouse.models import GreenhouseZone, SensorReading, ZoneThreshold
from .serializers import (
    GreenhouseZoneSerializer,
    SensorReadingSerializer,
    ZoneThresholdSerializer,
)

class GreenhouseZoneViewSet(viewsets.ModelViewSet):
    """
    Zones: Full CRUD (GET, POST, PUT, DELETE)
    """
    queryset = GreenhouseZone.objects.all()
    serializer_class = GreenhouseZoneSerializer
    # No http_method_names needed; defaults to all allowed.


class ZoneThresholdViewSet(viewsets.ModelViewSet):
    """
    Thresholds: GET and UPDATE only.
    Creation and Deletion are handled automatically via Zone signals.
    """
    queryset = ZoneThreshold.objects.all()
    serializer_class = ZoneThresholdSerializer
    
    # Restrict methods to GET, PUT, and PATCH
    http_method_names = ['get', 'put', 'patch', 'head', 'options']


class SensorReadingViewSet(viewsets.ModelViewSet):
    """
    Readings/Logs: GET and POST only.
    History cannot be modified or deleted.
    """
    queryset = SensorReading.objects.all().order_by('-timestamp')
    serializer_class = SensorReadingSerializer

    # Restrict methods to GET and POST
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """
        Allows filtering logs by zone.
        Usage: /api/readings/?zone=1
        """
        queryset = super().get_queryset()
        zone_id = self.request.query_params.get('zone')
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
        
        # Limit to 100 for performance (read-only optimization)
        return queryset[:100]

    def create(self, request, *args, **kwargs):
        # Support for bulk upload (List of items)
        is_many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_many)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)