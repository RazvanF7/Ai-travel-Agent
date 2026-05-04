from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserProfileSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """Get or update current user's profile (US-001)."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_login(request):
    """
    Handle Google OAuth token exchange (US-001).
    The frontend sends the Google access_token; we verify and create/login the user.
    """
    from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
    from dj_rest_auth.registration.views import SocialLoginView

    # Delegate to dj-rest-auth social login
    class GoogleLogin(SocialLoginView):
        adapter_class = GoogleOAuth2Adapter

    view = GoogleLogin.as_view()
    return view(request._request)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def demo_login(request):
    """
    Create or login a demo user for testing without Google OAuth.
    Accepts { "email": "...", "username": "..." }
    """
    email = request.data.get('email', 'demo@aitravelhub.com')
    username = request.data.get('username', email.split('@')[0])
    first_name = request.data.get('first_name', username.capitalize())

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'first_name': first_name,
            'last_name': request.data.get('last_name', ''),
        }
    )
    if not created:
        # Update name if provided
        if request.data.get('first_name'):
            user.first_name = request.data['first_name']
            user.save()

    # Ensure profile exists
    UserProfile.objects.get_or_create(user=user)

    # Issue JWT tokens
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    }, status=status.HTTP_200_OK)
