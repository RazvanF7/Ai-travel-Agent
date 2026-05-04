import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time group chat (US-007),
    presence tracking and typing indicators (US-016).
    """

    async def connect(self):
        self.group_id = self.scope['url_route']['kwargs']['group_id']
        self.room_group_name = f'chat_{self.group_id}'
        self.user = self.scope.get('user')

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Broadcast presence (US-016)
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence.update',
                    'user_id': self.user.id,
                    'username': getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous'),
                    'status': 'online',
                }
            )

    async def disconnect(self, close_code):
        # Broadcast offline presence
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence.update',
                    'user_id': self.user.id,
                    'username': getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous'),
                    'status': 'offline',
                }
            )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content):
        msg_type = content.get('type', 'chat.message')

        if msg_type == 'chat.message':
            message_content = content.get('message', '')
            if not message_content.strip():
                return

            # Persist message to database (US-007 AC-4)
            message_data = await self.save_message(message_content)

            # Broadcast to group (US-007 AC-1)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'message': message_data,
                }
            )

        elif msg_type == 'typing.start':
            # Typing indicator (US-016)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing.indicator',
                    'user_id': self.user.id if self.user and self.user.is_authenticated else 0,
                    'username': getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous'),
                    'is_typing': True,
                }
            )

        elif msg_type == 'typing.stop':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing.indicator',
                    'user_id': self.user.id if self.user and self.user.is_authenticated else 0,
                    'username': getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous'),
                    'is_typing': False,
                }
            )

    @database_sync_to_async
    def save_message(self, content):
        from .models import Message
        msg = Message.objects.create(
            group_id=self.group_id,
            sender_id=self.user.id if self.user and self.user.is_authenticated else None,
            content=content,
            message_type='text',
        )
        return {
            'id': msg.id,
            'sender_id': self.user.id if self.user and self.user.is_authenticated else None,
            'sender_name': getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous'),
            'sender_email': getattr(self.user, 'email', ''),
            'content': msg.content,
            'message_type': msg.message_type,
            'created_at': msg.created_at.isoformat(),
        }

    # ── Handler methods for channel layer messages ──

    async def chat_message(self, event):
        """Send chat message to WebSocket."""
        await self.send_json({
            'type': 'chat.message',
            'message': event['message'],
        })

    async def presence_update(self, event):
        """Send presence update to WebSocket."""
        await self.send_json({
            'type': 'presence.update',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status'],
        })

    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket (skip sender)."""
        if self.user and event['user_id'] == self.user.id:
            return  # Don't send typing indicator back to the typer
        await self.send_json({
            'type': 'typing.indicator',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing'],
        })

    async def member_joined(self, event):
        """Notify when a new member joins (US-003 AC-4)."""
        await self.send_json({
            'type': 'member.joined',
            'user_id': event['user_id'],
            'username': event['username'],
            'message': event['message'],
        })

    async def system_message(self, event):
        """Send system message (e.g., AI itinerary ready)."""
        await self.send_json({
            'type': 'system.message',
            'message': event['message'],
        })
