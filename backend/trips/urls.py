from django.urls import path
from . import views

urlpatterns = [
    path('', views.TripListCreateView.as_view(), name='trip-list-create'),
    path('<int:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('<int:trip_id>/itinerary/', views.ItineraryItemListCreateView.as_view(), name='itinerary-list-create'),
    path('<int:trip_id>/itinerary/<int:pk>/', views.ItineraryItemDetailView.as_view(), name='itinerary-detail'),
    path('<int:trip_id>/itinerary/reorder/', views.reorder_itinerary, name='itinerary-reorder'),
]
