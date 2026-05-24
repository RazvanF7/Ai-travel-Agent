import jwt
import datetime
from django.conf import settings

def generate_tokens_for_user(user):
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    access_exp_minutes = getattr(settings, 'JWT_ACCESS_EXPIRATION_MINUTES', 15)
    refresh_exp_days = getattr(settings, 'JWT_REFRESH_EXPIRATION_DAYS', 30)

    # Access Token
    access_payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=access_exp_minutes),
        'iat': datetime.datetime.utcnow(),
        'type': 'access'
    }
    access_token = jwt.encode(access_payload, secret, algorithm='HS256')

    # Refresh Token
    refresh_payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=refresh_exp_days),
        'iat': datetime.datetime.utcnow(),
        'type': 'refresh'
    }
    refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')

    return {
        'access': access_token,
        'refresh': refresh_token,
    }
