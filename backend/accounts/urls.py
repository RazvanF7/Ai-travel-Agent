from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('google/', views.google_login, name='google-login'),
    path('demo-login/', views.demo_login, name='demo-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
