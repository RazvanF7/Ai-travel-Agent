import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import ChecklistItem
from accounts.auth import jwt_required


def serialize_checklist_item(item):
    return {
        'id': item.id,
        'trip': item.trip.id,
        'title': item.title,
        'is_completed': item.is_completed,
        'completed_by': {
            'id': item.completed_by.id,
            'username': item.completed_by.username,
        } if item.completed_by else None,
        'completed_by_name': (
            item.completed_by.first_name or item.completed_by.username
        ) if item.completed_by else '',
        'created_by': {
            'id': item.created_by.id,
            'username': item.created_by.username,
        } if item.created_by else None,
        'created_by_name': (
            item.created_by.first_name or item.created_by.username
        ) if item.created_by else '',
        'created_at': item.created_at.isoformat(),
        'updated_at': item.updated_at.isoformat(),
    }


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class ChecklistListCreateView(View):
    """List or create checklist items for a trip (US-008)."""

    def get(self, request, trip_id, *args, **kwargs):
        qs = ChecklistItem.objects.filter(
            trip_id=trip_id
        ).select_related('completed_by', 'created_by')

        data = [serialize_checklist_item(item) for item in qs]
        return JsonResponse(data, safe=False)

    def post(self, request, trip_id, *args, **kwargs):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        item = ChecklistItem.objects.create(
            trip_id=trip_id,
            created_by=request.user,
            title=data.get('title'),
            is_completed=data.get('is_completed', False)
        )
        # Update completed_by if it's completed upon creation
        if item.is_completed:
            item.completed_by = request.user
            item.save()

        return JsonResponse(serialize_checklist_item(item), status=201)


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class ChecklistToggleView(View):
    """Toggle a checklist item's completion status (US-008 AC-3)."""

    def post(self, request, trip_id, item_id, *args, **kwargs):
        item = get_object_or_404(
            ChecklistItem, id=item_id, trip_id=trip_id
        )

        if item.is_completed:
            # Uncomplete
            item.is_completed = False
            item.completed_by = None
            item.completed_at = None
        else:
            # Complete
            item.is_completed = True
            item.completed_by = request.user
            item.completed_at = timezone.now()

        item.save()
        return JsonResponse(serialize_checklist_item(item))


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class ChecklistDeleteView(View):
    """Delete a checklist item."""

    def delete(self, request, trip_id, item_id, *args, **kwargs):
        item = get_object_or_404(
            ChecklistItem, id=item_id, trip_id=trip_id
        )
        item.delete()
        return JsonResponse({'deleted': True})
