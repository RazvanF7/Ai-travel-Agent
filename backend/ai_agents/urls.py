from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.ai_status, name='ai-status'),
    path('generate-itinerary/', views.generate_itinerary, name='ai-generate-itinerary'),
    path('concierge/', views.concierge_chat, name='ai-concierge'),
]
