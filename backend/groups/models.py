import string
import random
from django.db import models
from django.contrib.auth.models import User


def generate_invite_code():
    """Generate a unique 8-character alphanumeric invite code (US-002 AC-4)."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=8))
        if not Group.objects.filter(invite_code=code).exists():
            return code


class Group(models.Model):
    """A travel group with a shareable invite code (US-002)."""
    name = models.CharField(max_length=100)
    invite_code = models.CharField(max_length=8, unique=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = generate_invite_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.invite_code})'

    class Meta:
        ordering = ['-created_at']


class GroupMembership(models.Model):
    """Tracks which users belong to which groups with their role (US-002, US-003)."""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'group')
        ordering = ['joined_at']

    def __str__(self):
        return f'{self.user.username} → {self.group.name} ({self.role})'
