from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Message
from .serializers import MessageSerializer


class MessageHistoryView(generics.ListAPIView):
    """Get last 50 messages for a group (US-007 AC-2)."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        group_id = self.kwargs['group_id']
        # Get the last 50, then reverse to chronological order
        messages = Message.objects.filter(
            group_id=group_id
        ).select_related('sender').order_by('-created_at')[:50]
        return reversed(list(messages))

    def list(self, request, *args, **kwargs):
        queryset = list(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
