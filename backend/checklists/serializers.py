from rest_framework import serializers
from .models import ChecklistItem


class ChecklistItemSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(
        source='completed_by.first_name', read_only=True, default=''
    )
    created_by_name = serializers.CharField(
        source='created_by.first_name', read_only=True
    )

    class Meta:
        model = ChecklistItem
        fields = [
            'id', 'trip', 'title', 'is_completed', 'completed_by',
            'completed_by_name', 'completed_at', 'created_by',
            'created_by_name', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'completed_by', 'completed_at', 'created_by', 'created_at']
