from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Trip, ItineraryItem
from .serializers import TripSerializer, TripCreateSerializer, ItineraryItemSerializer, ReorderSerializer
from groups.models import GroupMembership


class TripListCreateView(generics.ListCreateAPIView):
    """List trips for user's groups or create a new trip (US-004)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TripCreateSerializer
        return TripSerializer

    def get_queryset(self):
        user_groups = GroupMembership.objects.filter(
            user=self.request.user
        ).values_list('group_id', flat=True)

        qs = Trip.objects.filter(group_id__in=user_groups).prefetch_related('itinerary_items')

        # Optional filter by group
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verify user is a member of the group
        group_id = serializer.validated_data['group'].id
        if not GroupMembership.objects.filter(user=request.user, group_id=group_id).exists():
            return Response(
                {'error': 'You are not a member of this group.'},
                status=status.HTTP_403_FORBIDDEN
            )

        trip = serializer.save()
        return Response(
            TripSerializer(trip).data,
            status=status.HTTP_201_CREATED
        )


class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a trip."""
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_groups = GroupMembership.objects.filter(
            user=self.request.user
        ).values_list('group_id', flat=True)
        return Trip.objects.filter(group_id__in=user_groups).prefetch_related('itinerary_items')


class ItineraryItemListCreateView(generics.ListCreateAPIView):
    """List or create itinerary items for a trip (US-005, US-006)."""
    serializer_class = ItineraryItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ItineraryItem.objects.filter(trip_id=self.kwargs['trip_id'])

    def perform_create(self, serializer):
        serializer.save(trip_id=self.kwargs['trip_id'])


class ItineraryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an itinerary item (US-006)."""
    serializer_class = ItineraryItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ItineraryItem.objects.filter(trip_id=self.kwargs['trip_id'])


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reorder_itinerary(request, trip_id):
    """Reorder itinerary items by providing ordered list of IDs (US-006)."""
    serializer = ReorderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    item_ids = serializer.validated_data['item_ids']
    for order, item_id in enumerate(item_ids):
        ItineraryItem.objects.filter(id=item_id, trip_id=trip_id).update(order=order)

    items = ItineraryItem.objects.filter(trip_id=trip_id).order_by('day', 'order')
    return Response(ItineraryItemSerializer(items, many=True).data)
