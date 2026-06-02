import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import Message
from accounts.auth import jwt_required


def serialize_message(message):
    return {
        'id': message.id,
        'group': message.group.id,
        'sender': {
            'id': message.sender.id,
            'username': message.sender.username,
            'first_name': message.sender.first_name,
            'last_name': message.sender.last_name,
        } if message.sender else None,
        'sender_id': message.sender.id if message.sender else None,
        'sender_name': (
            message.sender.first_name or message.sender.username
        ) if message.sender else 'System',
        'content': message.content,
        'message_type': message.message_type,
        'is_system': message.message_type == 'system',
        'created_at': message.created_at.isoformat(),
    }


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class MessageHistoryView(View):
    """Get messages for a group (US-007 AC-2).

    Supports polling via ?since=<iso_timestamp> query param
    to return only messages newer than the given timestamp.
    Without ?since, returns the last 50 messages.
    """

    def get(self, request, group_id, *args, **kwargs):
        since = request.GET.get('since')

        if since:
            # Polling mode: return messages newer than 'since'
            from django.utils.dateparse import parse_datetime
            since_dt = parse_datetime(since)
            if since_dt:
                messages = Message.objects.filter(
                    group_id=group_id,
                    created_at__gt=since_dt,
                ).select_related('sender').order_by('created_at')
                data = [serialize_message(msg) for msg in messages]
                return JsonResponse(data, safe=False)

        # Default: last 50 messages in chronological order
        messages = Message.objects.filter(
            group_id=group_id
        ).select_related('sender').order_by('-created_at')[:50]

        ordered_messages = reversed(list(messages))
        data = [serialize_message(msg) for msg in ordered_messages]
        return JsonResponse(data, safe=False)


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class SendMessageView(View):
    """Send a message to a group chat (US-007)."""

    def post(self, request, group_id, *args, **kwargs):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        content = body.get('content', '').strip()
        if not content:
            return JsonResponse({'error': 'Message content is required'}, status=400)

        msg = Message.objects.create(
            group_id=group_id,
            sender=request.user,
            content=content,
            message_type='text',
        )

        return JsonResponse(serialize_message(msg), status=201)
