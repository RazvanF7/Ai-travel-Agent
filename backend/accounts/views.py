import json
import requests
import jwt
from django.conf import settings
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login as auth_login, logout as auth_logout, authenticate
from django.shortcuts import redirect
from django.urls import reverse
import urllib.parse
from .models import UserProfile
from .auth import jwt_required
from .utils import generate_tokens_for_user
import os

def serialize_user_profile(profile):
    return {
        'id': profile.id,
        'user': {
            'id': profile.user.id,
            'username': profile.user.username,
            'email': profile.user.email,
            'first_name': profile.user.first_name,
            'last_name': profile.user.last_name,
        },
        'bio': profile.bio,
        'avatar_url': profile.avatar_url,
        'preferences': profile.preferences,
    }

@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class MeView(View):
    """Get or update current user's profile (US-001)."""
    
    def get(self, request, *args, **kwargs):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return JsonResponse(serialize_user_profile(profile))

    def put(self, request, *args, **kwargs):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)
            
        # Update user fields if present
        user = request.user
        user_data = data.get('user', {})
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        user.save()
        
        # Update profile fields
        if 'bio' in data:
            profile.bio = data['bio']
        if 'preferences' in data:
            profile.preferences = data['preferences']
            
        profile.save()
        return JsonResponse(serialize_user_profile(profile))


@csrf_exempt
def google_login(request):
    """
    Handle Google OAuth token exchange (US-001).
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        access_token = data.get('access_token')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
        
    if not access_token:
        return JsonResponse({'error': 'access_token required'}, status=400)
        
    # Verify token with Google
    response = requests.get(f'https://oauth2.googleapis.com/tokeninfo?access_token={access_token}')
    if response.status_code != 200:
        return JsonResponse({'error': 'Invalid Google token'}, status=400)
        
    google_data = response.json()
    email = google_data.get('email')
    if not email:
        return JsonResponse({'error': 'Email not provided by Google'}, status=400)
        
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': google_data.get('given_name', ''),
            'last_name': google_data.get('family_name', ''),
        }
    )
    
    UserProfile.objects.get_or_create(user=user)
    
    tokens = generate_tokens_for_user(user)
    return JsonResponse({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    })

@csrf_exempt
def demo_login(request):
    """
    Create or login a demo user for testing without Google OAuth.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = {}
        
    email = data.get('email', 'demo@aitravelhub.com')
    username = data.get('username', email.split('@')[0])
    first_name = data.get('first_name', username.capitalize())

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'first_name': first_name,
            'last_name': data.get('last_name', ''),
        }
    )
    
    if not created and data.get('first_name'):
        user.first_name = data['first_name']
        user.save()

    UserProfile.objects.get_or_create(user=user)

    tokens = generate_tokens_for_user(user)
    return JsonResponse({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    })

@csrf_exempt
def refresh_token(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        refresh = data.get('refresh')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    if not refresh:
        return JsonResponse({'error': 'Refresh token is required'}, status=400)
        
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    try:
        payload = jwt.decode(refresh, secret, algorithms=['HS256'])
        if payload.get('type') != 'refresh':
            return JsonResponse({'error': 'Invalid token type'}, status=401)
            
        user = User.objects.get(id=payload['user_id'])
    except jwt.ExpiredSignatureError:
        return JsonResponse({'error': 'Refresh token expired'}, status=401)
    except (jwt.InvalidTokenError, User.DoesNotExist):
        return JsonResponse({'error': 'Invalid refresh token'}, status=401)
        
    tokens = generate_tokens_for_user(user)
    return JsonResponse({
        'access': tokens['access'],
        'refresh': tokens['refresh']
    })


@csrf_exempt
def session_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = {}
        
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return JsonResponse({'error': 'Email and password are required'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Invalid email or password'}, status=401)

    if not user.check_password(password):
        return JsonResponse({'error': 'Invalid email or password'}, status=401)

    auth_login(request, user)
    return JsonResponse({'success': True})


@csrf_exempt
def session_signup(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = {}

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()

    if not email or not password:
        return JsonResponse({'error': 'Email and password are required'}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({'error': 'An account with this email already exists'}, status=409)

    username = email.split('@')[0]
    user = User.objects.create(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
    )
    user.set_password(password)
    user.save()

    UserProfile.objects.get_or_create(user=user)
    auth_login(request, user)
    return JsonResponse({'success': True})

def session_logout(request):
    auth_logout(request)
    return redirect('landing')

def google_oauth_redirect(request):
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    redirect_uri = request.build_absolute_uri(reverse('google-oauth-callback'))
    scope = 'email profile'
    response_type = 'code'
    
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri)}&response_type={response_type}&scope={urllib.parse.quote(scope)}&access_type=online"
    return redirect(url)

def google_oauth_callback(request):
    code = request.GET.get('code')
    if not code:
        return redirect('login')
        
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    redirect_uri = request.build_absolute_uri(reverse('google-oauth-callback'))
    
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    token_resp = requests.post(token_url, data=token_data)
    if not token_resp.ok:
        return redirect('login')
        
    token_json = token_resp.json()
    access_token = token_json.get('access_token')
    
    if not access_token:
        return redirect('login')
        
    user_info_resp = requests.get(f'https://oauth2.googleapis.com/tokeninfo?access_token={access_token}')
    if not user_info_resp.ok:
        return redirect('login')
        
    google_data = user_info_resp.json()
    email = google_data.get('email')
    
    if not email:
        return redirect('login')
        
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': google_data.get('given_name', ''),
            'last_name': google_data.get('family_name', ''),
        }
    )
    
    UserProfile.objects.get_or_create(user=user)
    auth_login(request, user)
    return redirect('dashboard')

