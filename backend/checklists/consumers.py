import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChecklistConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time checklist updates (US-008)."""

    async def connect(self):
        self.trip_id = self.scope['url_route']['kwargs']['trip_id']
        self.room_group_name = f'checklist_{self.trip_id}'
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

        if action == 'add':
            item_data = await self.add_item(content.get('title', ''))
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'checklist.update',
                    'action': 'added',
                    'item': item_data,
                }
            )

        elif action == 'toggle':
            item_data = await self.toggle_item(content.get('item_id'))
            if item_data:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'checklist.update',
                        'action': 'toggled',
                        'item': item_data,
                    }
                )

        elif action == 'delete':
            success = await self.delete_item(content.get('item_id'))
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'checklist.update',
                        'action': 'deleted',
                        'item': {'id': content.get('item_id')},
                    }
                )

    @database_sync_to_async
    def add_item(self, title):
        from .models import ChecklistItem
        item = ChecklistItem.objects.create(
            trip_id=self.trip_id,
            title=title,
            created_by_id=self.user.id if self.user and self.user.is_authenticated else None,
        )
        return {
            'id': item.id,
            'title': item.title,
            'is_completed': item.is_completed,
            'completed_by': None,
            'completed_by_name': '',
            'completed_at': None,
            'created_by': self.user.id if self.user and self.user.is_authenticated else None,
            'created_by_name': getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous'),
            'order': item.order,
        }

    @database_sync_to_async
    def toggle_item(self, item_id):
        from .models import ChecklistItem
        try:
            item = ChecklistItem.objects.select_for_update().get(
                id=item_id, trip_id=self.trip_id
            )
        except ChecklistItem.DoesNotExist:
            return None

        if item.is_completed:
            # Uncomplete
            item.is_completed = False
            item.completed_by = None
            item.completed_at = None
        else:
            # Complete (US-008 AC-3: only one completion recorded)
            item.is_completed = True
            item.completed_by_id = self.user.id if self.user and self.user.is_authenticated else None
            item.completed_at = timezone.now()

        item.save()
        return {
            'id': item.id,
            'title': item.title,
            'is_completed': item.is_completed,
            'completed_by': self.user.id if item.is_completed and self.user and self.user.is_authenticated else None,
            'completed_by_name': (getattr(self.user, 'first_name', '') or getattr(self.user, 'username', 'Anonymous')) if item.is_completed else '',
            'completed_at': item.completed_at.isoformat() if item.completed_at else None,
        }

    @database_sync_to_async
    def delete_item(self, item_id):
        from .models import ChecklistItem
        try:
            item = ChecklistItem.objects.get(id=item_id, trip_id=self.trip_id)
            item.delete()
            return True
        except ChecklistItem.DoesNotExist:
            return False

    async def checklist_update(self, event):
        """Send checklist update to WebSocket."""
        await self.send_json({
            'type': 'checklist.update',
            'action': event['action'],
            'item': event['item'],
        })
