from rest_framework import serializers
from .models import Message
from accounts.serializers import UserMinimalSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.first_name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'group', 'sender', 'sender_name', 'sender_email',
                  'content', 'message_type', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']
