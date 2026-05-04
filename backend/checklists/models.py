from django.db import models
from django.contrib.auth.models import User
from trips.models import Trip


class ChecklistItem(models.Model):
    """A shared checklist item for pre-trip tasks (US-008)."""
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='checklist_items')
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    completed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='completed_checklist_items'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_checklist_items')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        status = '✓' if self.is_completed else '○'
        return f'{status} {self.title}'
