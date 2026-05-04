from django.db import models
from groups.models import Group


class Trip(models.Model):
    """A trip within a group (US-004). A group can have multiple trips."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='trips')
    destination = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='EUR')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.destination} ({self.start_date} → {self.end_date})'

    @property
    def duration_days(self):
        return (self.end_date - self.start_date).days + 1

    class Meta:
        ordering = ['-start_date']


class ItineraryItem(models.Model):
    """A single activity in the trip itinerary (US-005, US-006)."""
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='itinerary_items')
    day = models.PositiveIntegerField(help_text='Day number within the trip')
    order = models.PositiveIntegerField(default=0, help_text='Position within the day')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    start_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day', 'order']

    def __str__(self):
        return f'Day {self.day} #{self.order}: {self.title}'
