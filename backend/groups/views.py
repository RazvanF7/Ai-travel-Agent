import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from .models import Group, GroupMembership
from accounts.auth import jwt_required

def serialize_group_membership(membership):
    return {
        'id': membership.id,
        'user': {
            'id': membership.user.id,
            'username': membership.user.username,
            'email': membership.user.email,
            'first_name': membership.user.first_name,
            'last_name': membership.user.last_name,
        },
        'role': membership.role,
        'joined_at': membership.joined_at.isoformat(),
    }

def serialize_group(group, include_memberships=True):
    data = {
        'id': group.id,
        'name': group.name,
        'created_by': {
            'id': group.created_by.id,
            'username': group.created_by.username,
        } if group.created_by else None,
        'invite_code': group.invite_code,
        'created_at': group.created_at.isoformat(),
    }
    if include_memberships:
        data['memberships'] = [serialize_group_membership(m) for m in group.memberships.all()]
    return data

@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class GroupListCreateView(View):
    """List user's groups or create a new group (US-002)."""
    
    def get(self, request, *args, **kwargs):
        qs = Group.objects.filter(
            memberships__user=request.user
        ).prefetch_related('memberships__user')
        
        data = [serialize_group(group) for group in qs]
        return JsonResponse(data, safe=False)

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        group = Group.objects.create(
            name=data.get('name', ''),
            created_by=request.user
        )
        
        # Creator is automatically admin (US-002 AC-1)
        GroupMembership.objects.create(
            user=request.user,
            group=group,
            role='admin'
        )
        
        # Return full group data
        group = Group.objects.prefetch_related('memberships__user').get(id=group.id)
        return JsonResponse(serialize_group(group), status=201)


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class GroupDetailView(View):
    """Get, update, or delete a group (admin only for updates)."""
    
    def get_group_or_404(self, request, pk):
        return get_object_or_404(
            Group.objects.filter(memberships__user=request.user).prefetch_related('memberships__user'),
            pk=pk
        )

    def get(self, request, pk, *args, **kwargs):
        group = self.get_group_or_404(request, pk)
        return JsonResponse(serialize_group(group))

    def put(self, request, pk, *args, **kwargs):
        group = self.get_group_or_404(request, pk)
        
        # Check if admin
        membership = GroupMembership.objects.filter(group=group, user=request.user).first()
        if not membership or membership.role != 'admin':
            return JsonResponse({'error': 'Only admins can update the group.'}, status=403)
            
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        if 'name' in data: group.name = data['name']
        group.save()
        
        return JsonResponse(serialize_group(group))

    def delete(self, request, pk, *args, **kwargs):
        group = self.get_group_or_404(request, pk)
        
        # Check if admin
        membership = GroupMembership.objects.filter(group=group, user=request.user).first()
        if not membership or membership.role != 'admin':
            return JsonResponse({'error': 'Only admins can delete the group.'}, status=403)
            
        group.delete()
        return JsonResponse({}, status=204)


@csrf_exempt
@jwt_required
def join_group(request):
    """Join a group via invite code (US-003)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        invite_code = data.get('invite_code', '').upper()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    try:
        group = Group.objects.get(invite_code=invite_code)
    except Group.DoesNotExist:
        return JsonResponse(
            {'error': 'Invalid invite code. Please check and try again.'},
            status=404
        )

    # Check if already a member (US-003 AC-3)
    if GroupMembership.objects.filter(user=request.user, group=group).exists():
        return JsonResponse(
            {'error': 'You are already in this group.'},
            status=400
        )

    # Create membership (US-003 AC-1)
    GroupMembership.objects.create(
        user=request.user,
        group=group,
        role='member'
    )

    # Notify via WebSocket (US-003 AC-4) — fire and forget
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'group_{group.id}',
            {
                'type': 'member.joined',
                'user_id': request.user.id,
                'username': request.user.first_name or request.user.username,
                'message': f'{request.user.first_name or request.user.username} joined the group',
            }
        )
    except Exception:
        pass  # Don't fail the join if notification fails

    group_data = serialize_group(
        Group.objects.prefetch_related('memberships__user').get(id=group.id)
    )
    return JsonResponse(group_data, status=200)
