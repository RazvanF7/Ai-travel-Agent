import jwt
from functools import wraps
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth.models import User

def jwt_required(view_func):
    """
    Decorator to protect views with JWT authentication.
    Requires 'Authorization: Bearer <token>' header.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authentication credentials were not provided.'}, status=401)
        
        token = auth_header.split(' ')[1]
        secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
        
        try:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            if payload.get('type') != 'access':
                return JsonResponse({'error': 'Invalid token type.'}, status=401)
                
            user = User.objects.get(id=payload['user_id'])
            request.user = user
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired.'}, status=401)
        except (jwt.InvalidTokenError, User.DoesNotExist):
            return JsonResponse({'error': 'Invalid token.'}, status=401)
            
        return view_func(request, *args, **kwargs)
        
    return _wrapped_view
