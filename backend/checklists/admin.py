from django.contrib import admin
from .models import ChecklistItem

@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'trip', 'is_completed', 'completed_by', 'created_by']
    list_filter = ['is_completed', 'trip']
