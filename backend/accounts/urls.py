from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('google/', views.google_login, name='google-login'),
    path('demo-login/', views.demo_login, name='demo-login'),
    path('token/refresh/', views.refresh_token, name='token-refresh'),
]
