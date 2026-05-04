from django.contrib import admin
from .models import NotificationPreference

@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'event_type', 'enabled']
    list_filter = ['event_type', 'enabled']
