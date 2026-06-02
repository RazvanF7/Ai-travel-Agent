from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('google/', views.google_login, name='google-login'),
    path('demo-login/', views.demo_login, name='demo-login'),
    path('token/refresh/', views.refresh_token, name='token-refresh'),
    path('session-login/', views.session_login, name='session-login'),
    path('session-signup/', views.session_signup, name='session-signup'),
    path('logout/', views.session_logout, name='logout'),
    path('google/redirect/', views.google_oauth_redirect, name='google-oauth-redirect'),
    path('google/callback/', views.google_oauth_callback, name='google-oauth-callback'),
]
