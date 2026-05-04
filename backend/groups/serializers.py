from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Group, GroupMembership
from accounts.serializers import UserMinimalSerializer


class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'role', 'joined_at']


class GroupSerializer(serializers.ModelSerializer):
    members = GroupMembershipSerializer(source='memberships', many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.first_name', read_only=True)

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'invite_code', 'created_by', 'created_by_name',
            'members', 'member_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'invite_code', 'created_by', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.memberships.count()


class GroupCreateSerializer(serializers.ModelSerializer):
    """Validates group name is 3-100 chars (US-002 AC-3)."""

    class Meta:
        model = Group
        fields = ['name']

    def validate_name(self, value):
        if len(value) < 3:
            raise serializers.ValidationError('Group name must be at least 3 characters.')
        if len(value) > 100:
            raise serializers.ValidationError('Group name must be at most 100 characters.')
        return value


class JoinGroupSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=8, min_length=8)
