import json
import asyncio
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .rate_limiter import check_rate_limit, record_request


class AIStreamConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for streaming AI responses (US-005 AC-2, US-013 AC-1).
    Handles both Pathfinder (itinerary) and Concierge (in-trip) requests.
    """

    async def connect(self):
        self.group_id = self.scope['url_route']['kwargs']['group_id']
        self.room_group_name = f'ai_{self.group_id}'
        self.user = self.scope.get('user')

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content):
        action = content.get('action')
        user_id = self.user.id if self.user and self.user.is_authenticated else 0

        # Rate limit check (US-005 AC-5)
        allowed, retry_after = check_rate_limit(user_id)
        if not allowed:
            await self.send_json({
                'type': 'error',
                'message': f'Rate limit exceeded. Try again in {retry_after} seconds.',
                'retry_after': retry_after,
            })
            return

        record_request(user_id)

        if action == 'generate_itinerary':
            await self.handle_itinerary(content)
        elif action == 'concierge':
            await self.handle_concierge(content)

    async def handle_itinerary(self, content):
        """Handle Pathfinder itinerary generation (US-005)."""
        from .pathfinder import stream_itinerary

        destination = content.get('destination', '')
        duration_days = content.get('duration_days', 3)
        budget = content.get('budget')
        currency = content.get('currency', 'EUR')
        preferences = content.get('preferences', '')
        trip_id = content.get('trip_id')

        # Send queued status (US-005 AC-1)
        await self.send_json({
            'type': 'status',
            'status': 'generating',
            'message': 'Generating your itinerary...',
        })

        # Broadcast to all group members
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'ai.status',
                'status': 'generating',
                'user_id': self.user.id if self.user and self.user.is_authenticated else 0,
                'message': f'Generating itinerary for {destination}...',
            }
        )

        try:
            async for chunk in stream_itinerary(
                destination, duration_days, budget, currency, preferences
            ):
                if chunk['type'] == 'token':
                    # Stream token to all group members (US-005 AC-2)
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'ai.token',
                            'content': chunk['content'],
                        }
                    )
                elif chunk['type'] == 'complete':
                    # Save itinerary items to database (US-005 AC-3)
                    if trip_id and chunk.get('activities'):
                        await self.save_itinerary_items(trip_id, chunk['activities'])

                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'ai.complete',
                            'message': 'Itinerary generated successfully!',
                            'activities': chunk.get('activities', []),
                        }
                    )

                    # Post system message to chat (US-007 AC-5)
                    await self.post_chat_message(
                        f'🗺️ Pathfinder generated a new itinerary for {destination}. Tap to view.'
                    )

                elif chunk['type'] == 'error':
                    await self.send_json({
                        'type': 'error',
                        'message': f'AI could not complete the request. Please try again. ({chunk["message"]})',
                    })

        except Exception as e:
            await self.send_json({
                'type': 'error',
                'message': 'AI could not complete the request. Please try again.',
            })

    async def handle_concierge(self, content):
        """Handle Concierge in-trip assistance (US-013)."""
        from .concierge import stream_concierge_response

        question = content.get('question', '')
        trip_id = content.get('trip_id')

        trip = await self.get_trip(trip_id) if trip_id else None

        await self.send_json({
            'type': 'status',
            'status': 'thinking',
            'message': 'Thinking...',
        })

        try:
            async for chunk in stream_concierge_response(question, trip=trip):
                if chunk['type'] == 'token':
                    await self.send_json({
                        'type': 'ai.token',
                        'content': chunk['content'],
                    })
                elif chunk['type'] == 'complete':
                    await self.send_json({
                        'type': 'ai.complete',
                        'message': 'Response complete',
                        'has_suggestion': chunk.get('has_suggestion', False),
                    })
                elif chunk['type'] == 'error':
                    await self.send_json({
                        'type': 'error',
                        'message': chunk['message'],
                    })
        except Exception as e:
            await self.send_json({
                'type': 'error',
                'message': 'AI could not complete the request. Please try again.',
            })

    @database_sync_to_async
    def save_itinerary_items(self, trip_id, activities):
        """Save parsed itinerary items to database (US-005 AC-3)."""
        from trips.models import ItineraryItem
        for activity in activities:
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

    @database_sync_to_async
    def get_trip(self, trip_id):
        from trips.models import Trip
        try:
            return Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return None

    @database_sync_to_async
    def post_chat_message(self, content):
        """Post a system message to the group chat."""
        from chat.models import Message
        from django.contrib.auth.models import User
        try:
            bot_user = User.objects.get_or_create(
                username='pathfinder',
                defaults={'first_name': 'Pathfinder', 'email': 'pathfinder@aitravelhub.com'}
            )[0]
            Message.objects.create(
                group_id=self.group_id,
                sender=bot_user,
                content=content,
                message_type='ai',
            )
        except Exception:
            pass

    # ── Channel layer handlers ──

    async def ai_status(self, event):
        await self.send_json({
            'type': 'ai.status',
            'status': event['status'],
            'message': event['message'],
        })

    async def ai_token(self, event):
        await self.send_json({
            'type': 'ai.token',
            'content': event['content'],
        })

    async def ai_complete(self, event):
        await self.send_json({
            'type': 'ai.complete',
            'message': event['message'],
            'activities': event.get('activities', []),
        })
