from django.db import models
from django.contrib.auth.models import User
from groups.models import Group


class Message(models.Model):
    """A chat message in a group (US-007). Persisted to PostgreSQL."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField()
    message_type = models.CharField(
        max_length=20,
        choices=[('text', 'Text'), ('system', 'System'), ('ai', 'AI')],
        default='text'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.username}: {self.content[:50]}'
