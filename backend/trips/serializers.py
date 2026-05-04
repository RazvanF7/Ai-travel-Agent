from rest_framework import serializers
from .models import Trip, ItineraryItem


class ItineraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItineraryItem
        fields = [
            'id', 'trip', 'day', 'order', 'title', 'description',
            'location', 'start_time', 'duration_minutes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TripSerializer(serializers.ModelSerializer):
    itinerary_items = ItineraryItemSerializer(many=True, read_only=True)
    duration_days = serializers.ReadOnlyField()

    class Meta:
        model = Trip
        fields = [
            'id', 'group', 'destination', 'start_date', 'end_date',
            'budget', 'currency', 'description', 'duration_days',
            'itinerary_items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError('End date must be after start date.')
        return data


class TripCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ['group', 'destination', 'start_date', 'end_date', 'budget', 'currency', 'description']

    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError('End date must be after start date.')
        return data


class ReorderSerializer(serializers.Serializer):
    """For reordering itinerary items (US-006)."""
    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='Ordered list of item IDs'
    )
