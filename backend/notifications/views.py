from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import NotificationPreference
from .serializers import NotificationPreferenceSerializer
from accounts.models import UserProfile


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def register_push_token(request):
    """Register a push notification token (US-014)."""
    push_token = request.data.get('push_token', '')
    if not push_token:
        return Response({'error': 'push_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.push_token = push_token
    profile.save()

    return Response({'status': 'Push token registered.'})


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
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

        serializer = NotificationPreferenceSerializer(prefs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        event_type = request.data.get('event_type')
        enabled = request.data.get('enabled', True)

        pref, _ = NotificationPreference.objects.update_or_create(
            user=request.user,
            event_type=event_type,
            defaults={'enabled': enabled}
        )
        return Response(NotificationPreferenceSerializer(pref).data)
