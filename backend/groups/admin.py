from django.contrib import admin
from .models import Group, GroupMembership

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'invite_code', 'created_by', 'created_at']
    search_fields = ['name', 'invite_code']

@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'group', 'role', 'joined_at']
    list_filter = ['role']
