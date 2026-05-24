import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from .models import Trip, ItineraryItem
from groups.models import GroupMembership
from groups.models import Group
from accounts.auth import jwt_required

def serialize_itinerary_item(item):
    return {
        'id': item.id,
        'trip': item.trip.id,
        'title': item.title,
        'description': item.description,
        'day': item.day,
        'order': item.order,
        'start_time': item.start_time.isoformat() if item.start_time else None,
        'duration_minutes': item.duration_minutes,
        'location': item.location,
        'created_at': item.created_at.isoformat(),
        'updated_at': item.updated_at.isoformat(),
    }

def serialize_trip(trip, include_itinerary=True):
    data = {
        'id': trip.id,
        'group': trip.group.id,
        'description': trip.description,
        'destination': trip.destination,
        'start_date': trip.start_date.isoformat() if trip.start_date else None,
        'end_date': trip.end_date.isoformat() if trip.end_date else None,
        'budget': str(trip.budget) if trip.budget else None,
        'created_at': trip.created_at.isoformat(),
        'updated_at': trip.updated_at.isoformat(),
    }
    if include_itinerary:
        data['itinerary_items'] = [serialize_itinerary_item(item) for item in trip.itinerary_items.all()]
    return data

@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class TripListCreateView(View):
    """List trips for user's groups or create a new trip (US-004)."""
    
    def get(self, request, *args, **kwargs):
        user_groups = GroupMembership.objects.filter(
            user=request.user
        ).values_list('group_id', flat=True)

        qs = Trip.objects.filter(group_id__in=user_groups).prefetch_related('itinerary_items')

        group_id = request.GET.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)

        data = [serialize_trip(trip) for trip in qs]
        return JsonResponse(data, safe=False)

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        group_id = data.get('group')
        if not group_id:
            return JsonResponse({'error': 'group is required'}, status=400)
            
        # Verify user is a member of the group
        if not GroupMembership.objects.filter(user=request.user, group_id=group_id).exists():
            return JsonResponse({'error': 'You are not a member of this group.'}, status=403)
            
        group = get_object_or_404(Group, id=group_id)
        
        trip = Trip.objects.create(
            group=group,
            description=data.get('description', ''),
            destination=data.get('destination', ''),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            budget=data.get('budget')
        )
        return JsonResponse(serialize_trip(trip), status=201)


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class TripDetailView(View):
    """Get, update, or delete a trip."""
    
    def get_trip_or_404(self, request, pk):
        user_groups = GroupMembership.objects.filter(
            user=request.user
        ).values_list('group_id', flat=True)
        return get_object_or_404(Trip.objects.filter(group_id__in=user_groups).prefetch_related('itinerary_items'), pk=pk)

    def get(self, request, pk, *args, **kwargs):
        trip = self.get_trip_or_404(request, pk)
        return JsonResponse(serialize_trip(trip))

    def put(self, request, pk, *args, **kwargs):
        trip = self.get_trip_or_404(request, pk)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        if 'description' in data: trip.description = data['description']
        if 'destination' in data: trip.destination = data['destination']
        if 'start_date' in data: trip.start_date = data['start_date']
        if 'end_date' in data: trip.end_date = data['end_date']
        if 'budget' in data: trip.budget = data['budget']
        
        trip.save()
        return JsonResponse(serialize_trip(trip))
        
    def delete(self, request, pk, *args, **kwargs):
        trip = self.get_trip_or_404(request, pk)
        trip.delete()
        return JsonResponse({}, status=204)


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class ItineraryItemListCreateView(View):
    """List or create itinerary items for a trip (US-005, US-006)."""
    
    def get(self, request, trip_id, *args, **kwargs):
        qs = ItineraryItem.objects.filter(trip_id=trip_id).order_by('day', 'order')
        return JsonResponse([serialize_itinerary_item(item) for item in qs], safe=False)

    def post(self, request, trip_id, *args, **kwargs):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        trip = get_object_or_404(Trip, id=trip_id)
        
        item = ItineraryItem.objects.create(
            trip=trip,
            title=data.get('title'),
            description=data.get('description', ''),
            day=data.get('day', 1),
            order=data.get('order', 0),
            start_time=data.get('start_time'),
            duration_minutes=data.get('duration_minutes'),
            location=data.get('location', '')
        )
        return JsonResponse(serialize_itinerary_item(item), status=201)


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class ItineraryItemDetailView(View):
    """Get, update, or delete an itinerary item (US-006)."""
    
    def get(self, request, trip_id, pk, *args, **kwargs):
        item = get_object_or_404(ItineraryItem, trip_id=trip_id, pk=pk)
        return JsonResponse(serialize_itinerary_item(item))

    def put(self, request, trip_id, pk, *args, **kwargs):
        item = get_object_or_404(ItineraryItem, trip_id=trip_id, pk=pk)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        if 'title' in data: item.title = data['title']
        if 'description' in data: item.description = data['description']
        if 'day' in data: item.day = data['day']
        if 'order' in data: item.order = data['order']
        if 'start_time' in data: item.start_time = data['start_time']
        if 'duration_minutes' in data: item.duration_minutes = data['duration_minutes']
        if 'location' in data: item.location = data['location']
        
        item.save()
        return JsonResponse(serialize_itinerary_item(item))

    def delete(self, request, trip_id, pk, *args, **kwargs):
        item = get_object_or_404(ItineraryItem, trip_id=trip_id, pk=pk)
        item.delete()
        return JsonResponse({}, status=204)


@csrf_exempt
@jwt_required
def reorder_itinerary(request, trip_id):
    """Reorder itinerary items by providing ordered list of IDs (US-006)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        item_ids = data.get('item_ids', [])
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    for order, item_id in enumerate(item_ids):
        ItineraryItem.objects.filter(id=item_id, trip_id=trip_id).update(order=order)

    items = ItineraryItem.objects.filter(trip_id=trip_id).order_by('day', 'order')
    return JsonResponse([serialize_itinerary_item(item) for item in items], safe=False)
