from django.db import models
from django.contrib.auth.models import User


class NotificationPreference(models.Model):
    """User notification preferences per event type (US-014 AC-3)."""
    EVENT_TYPES = [
        ('itinerary_ready', 'Itinerary Ready'),
        ('new_expense', 'New Expense'),
        ('member_joined', 'Member Joined'),
        ('chat_message', 'Chat Message'),
        ('checklist_update', 'Checklist Update'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_preferences')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'event_type')

    def __str__(self):
        status = 'ON' if self.enabled else 'OFF'
        return f'{self.user.username}: {self.event_type} [{status}]'
