from django.shortcuts import render

# Create your views here.
def zones_list(request):
    return render(request, "greenhouse/zones-list.html")

def thresholds_list(request):
    return render(request, "greenhouse/thresholds-list.html")

def logs_list(request):
    return render(request, "greenhouse/logs-list.html")