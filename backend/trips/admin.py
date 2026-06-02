from django.contrib import admin
from .models import Trip, ItineraryItem

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['destination', 'group', 'start_date', 'end_date', 'budget']
    list_filter = ['group']

@admin.register(ItineraryItem)
class ItineraryItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'trip', 'day', 'order', 'start_time']
    list_filter = ['trip']
