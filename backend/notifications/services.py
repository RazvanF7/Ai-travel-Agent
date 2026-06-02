"""
Web Push notification service (US-014).
Uses pywebpush for sending push notifications via VAPID.
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_push_notification(push_token, title, body, data=None):
    """
    Send a web push notification (US-014 AC-1, AC-2).
    push_token should be the full subscription JSON.
    """
    if not push_token or not settings.VAPID_PRIVATE_KEY:
        return False

    try:
        from pywebpush import webpush, WebPushException

        subscription_info = json.loads(push_token) if isinstance(push_token, str) else push_token

        payload = json.dumps({
            'title': title,
            'body': body,
            'data': data or {},
        })

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                'sub': f'mailto:{settings.VAPID_ADMIN_EMAIL}',
            },
        )
        return True

    except Exception as e:
        error_str = str(e)
        # US-014 AC-4: Clear stale push tokens
        if 'token not registered' in error_str.lower() or '410' in error_str:
            logger.warning(f'Stale push token detected, clearing.')
            try:
                from accounts.models import UserProfile
                # Find and clear the profile with this token
                profiles = UserProfile.objects.filter(push_token=push_token)
                profiles.update(push_token='')
            except Exception:
                pass
        else:
            logger.error(f'Push notification failed: {e}')
        return False


def notify_users(user_ids, event_type, title, body, data=None):
    """
    Send push notifications to multiple users, respecting their preferences (US-014 AC-3).
    """
    from accounts.models import UserProfile
    from .models import NotificationPreference

    for user_id in user_ids:
        # Check notification preference
        pref = NotificationPreference.objects.filter(
            user_id=user_id, event_type=event_type
        ).first()

        if pref and not pref.enabled:
            continue  # User disabled this notification type

        # Get push token
        try:
            profile = UserProfile.objects.get(user_id=user_id)
            if profile.push_token:
                send_push_notification(profile.push_token, title, body, data)
        except UserProfile.DoesNotExist:
            continue
