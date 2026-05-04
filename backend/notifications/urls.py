from django.urls import path
from . import views

urlpatterns = [
    path('push-token/', views.register_push_token, name='register-push-token'),
    path('preferences/', views.notification_preferences, name='notification-preferences'),
]
