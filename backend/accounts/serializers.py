from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'first_name', 'last_name', 'username',
            'preferred_currency', 'avatar_url', 'push_token',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for embedding in other responses."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
