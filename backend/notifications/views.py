import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import NotificationPreference
from accounts.models import UserProfile
from accounts.auth import jwt_required

def serialize_preference(pref):
    return {
        'id': pref.id,
        'event_type': pref.event_type,
        'enabled': pref.enabled,
    }

@csrf_exempt
@jwt_required
def register_push_token(request):
    """Register a push notification token (US-014)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        push_token = data.get('push_token', '')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if not push_token:
        return JsonResponse({'error': 'push_token is required.'}, status=400)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.push_token = push_token
    profile.save()

    return JsonResponse({'status': 'Push token registered.'})

@csrf_exempt
@jwt_required
def notification_preferences(request):
    """Get or update notification preferences (US-014 AC-3)."""
    if request.method == 'GET':
        # Return all preferences, creating defaults if needed
        event_types = [choice[0] for choice in NotificationPreference.EVENT_TYPES]
        prefs = []
        for event_type in event_types:
            pref, _ = NotificationPreference.objects.get_or_create(
                user=request.user,
                event_type=event_type,
                defaults={'enabled': True}
            )
            prefs.append(pref)

        return JsonResponse([serialize_preference(p) for p in prefs], safe=False)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        event_type = data.get('event_type')
        enabled = data.get('enabled', True)

        if not event_type:
            return JsonResponse({'error': 'event_type is required'}, status=400)

        pref, _ = NotificationPreference.objects.update_or_create(
            user=request.user,
            event_type=event_type,
            defaults={'enabled': enabled}
        )
        return JsonResponse(serialize_preference(pref))
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
