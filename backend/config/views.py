from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

def landing_view(request):
    return render(request, 'landing.html')

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'login.html')

from groups.models import GroupMembership
from trips.models import Trip

@login_required
def dashboard_view(request):
    memberships = GroupMembership.objects.filter(user=request.user).select_related('group')
    groups = [m.group for m in memberships]
    
    # Get trips for all groups the user is in
    trips = Trip.objects.filter(group__in=groups).order_by('start_date')
    
    context = {
        'groups': groups,
        'trips': trips
    }
    return render(request, 'dashboard.html', context)

from django.shortcuts import render, redirect, get_object_or_404

@login_required
def trip_view(request, trip_id):
    trip = get_object_or_404(Trip, id=trip_id)
    # Ensure user has access
    if not GroupMembership.objects.filter(user=request.user, group=trip.group).exists():
        return redirect('dashboard')
    
    return render(request, 'trip.html', {'trip': trip})
