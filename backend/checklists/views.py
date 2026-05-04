from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import ChecklistItem
from .serializers import ChecklistItemSerializer


class ChecklistListCreateView(generics.ListCreateAPIView):
    """List or create checklist items for a trip (US-008)."""
    serializer_class = ChecklistItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ChecklistItem.objects.filter(
            trip_id=self.kwargs['trip_id']
        ).select_related('completed_by', 'created_by')

    def perform_create(self, serializer):
        serializer.save(
            trip_id=self.kwargs['trip_id'],
            created_by=self.request.user
        )
