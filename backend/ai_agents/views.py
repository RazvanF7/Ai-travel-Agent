import json
import asyncio
from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .rate_limiter import check_rate_limit, record_request
from accounts.auth import jwt_required


@csrf_exempt
@jwt_required
def ai_status(request):
    """Check AI rate limit status for the current user."""
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    allowed, retry_after = check_rate_limit(request.user.id)
    return JsonResponse({
        'allowed': allowed,
        'retry_after': retry_after,
    })


def _run_async_generator_sync(async_gen):
    """Run an async generator synchronously, yielding items one at a time.

    Creates a new event loop to bridge the async streaming generators
    (pathfinder/concierge) into Django's synchronous StreamingHttpResponse.
    """
    loop = asyncio.new_event_loop()
    try:
        while True:
            try:
                item = loop.run_until_complete(async_gen.__anext__())
                yield item
            except StopAsyncIteration:
                break
    finally:
        loop.close()


def _sse_stream(async_gen):
    """Convert an async generator of dicts into SSE text/event-stream lines."""
    for chunk in _run_async_generator_sync(async_gen):
        event_type = chunk.get('type', 'message')
        data = json.dumps(chunk)
        yield f"event: {event_type}\ndata: {data}\n\n"


@csrf_exempt
@jwt_required
def generate_itinerary(request):
    """Generate an AI itinerary via SSE streaming (US-005).

    POST body: { destination, duration_days, budget, currency, preferences, trip_id }
    Response: text/event-stream with token/complete/error events.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    # Rate limit check (US-005 AC-5)
    user_id = request.user.id
    allowed, retry_after = check_rate_limit(user_id)
    if not allowed:
        return JsonResponse({
            'error': f'Rate limit exceeded. Try again in {retry_after} seconds.',
            'retry_after': retry_after,
        }, status=429)

    record_request(user_id)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    destination = body.get('destination', '')
    duration_days = body.get('duration_days', 3)
    budget = body.get('budget')
    currency = body.get('currency', 'EUR')
    preferences = body.get('preferences', '')
    trip_id = body.get('trip_id')

    from .pathfinder import stream_itinerary

    async def _stream():
        async for chunk in stream_itinerary(
            destination, duration_days, budget, currency, preferences
        ):
            yield chunk

            # Save itinerary items on completion (US-005 AC-3)
            if chunk['type'] == 'complete' and trip_id and chunk.get('activities'):
                from trips.models import ItineraryItem
                for activity in chunk['activities']:
                    try:
                        ItineraryItem.objects.create(
                            trip_id=trip_id,
                            day=activity.get('day', 1),
                            order=activity.get('order', 0),
                            title=activity.get('title', 'Activity'),
                            description=activity.get('description', ''),
                            location=activity.get('location', ''),
                            start_time=activity.get('start_time'),
                            duration_minutes=activity.get('duration_minutes'),
                        )
                    except Exception:
                        continue

                # Post system message to chat (US-007 AC-5)
                try:
                    from chat.models import Message
                    from django.contrib.auth.models import User
                    bot_user = User.objects.get_or_create(
                        username='pathfinder',
                        defaults={'first_name': 'Pathfinder', 'email': 'pathfinder@aitravelhub.com'}
                    )[0]
                    # Find group from trip
                    from trips.models import Trip
                    trip_obj = Trip.objects.get(id=trip_id)
                    Message.objects.create(
                        group_id=trip_obj.group_id,
                        sender=bot_user,
                        content=f'🗺️ Pathfinder generated a new itinerary for {destination}. Tap to view.',
                        message_type='ai',
                    )
                except Exception:
                    pass

    response = StreamingHttpResponse(
        _sse_stream(_stream()),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@csrf_exempt
@jwt_required
def concierge_chat(request):
    """AI Concierge in-trip assistance via SSE streaming (US-013).

    POST body: { question, trip_id }
    Response: text/event-stream with token/complete/error events.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    # Rate limit check
    user_id = request.user.id
    allowed, retry_after = check_rate_limit(user_id)
    if not allowed:
        return JsonResponse({
            'error': f'Rate limit exceeded. Try again in {retry_after} seconds.',
            'retry_after': retry_after,
        }, status=429)

    record_request(user_id)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    question = body.get('question', '')
    trip_id = body.get('trip_id')

    # Load trip context if available
    trip = None
    if trip_id:
        from trips.models import Trip
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            pass

    from .concierge import stream_concierge_response

    response = StreamingHttpResponse(
        _sse_stream(stream_concierge_response(question, trip=trip)),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
