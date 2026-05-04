from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupCreateSerializer, JoinGroupSerializer


class GroupListCreateView(generics.ListCreateAPIView):
    """List user's groups or create a new group (US-002)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GroupCreateSerializer
        return GroupSerializer

    def get_queryset(self):
        return Group.objects.filter(
            memberships__user=self.request.user
        ).prefetch_related('memberships__user')

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        # Creator is automatically admin (US-002 AC-1)
        GroupMembership.objects.create(
            user=self.request.user,
            group=group,
            role='admin'
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full group data
        group = Group.objects.prefetch_related('memberships__user').get(
            id=serializer.instance.id
        )
        return Response(
            GroupSerializer(group).data,
            status=status.HTTP_201_CREATED
        )


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a group (admin only for updates)."""
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(
            memberships__user=self.request.user
        ).prefetch_related('memberships__user')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def join_group(request):
    """Join a group via invite code (US-003)."""
    serializer = JoinGroupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    code = serializer.validated_data['invite_code'].upper()

    try:
        group = Group.objects.get(invite_code=code)
    except Group.DoesNotExist:
        return Response(
            {'error': 'Invalid invite code. Please check and try again.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if already a member (US-003 AC-3)
    if GroupMembership.objects.filter(user=request.user, group=group).exists():
        return Response(
            {'error': 'You are already in this group.'},
            status=status.HTTP_400_BAD_REQUEST
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

    group_data = GroupSerializer(
        Group.objects.prefetch_related('memberships__user').get(id=group.id)
    ).data
    return Response(group_data, status=status.HTTP_200_OK)
