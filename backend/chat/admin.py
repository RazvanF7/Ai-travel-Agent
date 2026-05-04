from django.contrib import admin
from .models import Message

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'group', 'content', 'message_type', 'created_at']
    list_filter = ['group', 'message_type']
