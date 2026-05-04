import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from config.middleware import JWTAuthMiddlewareStack
from chat.routing import websocket_urlpatterns as chat_ws
from checklists.routing import websocket_urlpatterns as checklist_ws
from ai_agents.routing import websocket_urlpatterns as ai_ws

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(
            chat_ws + checklist_ws + ai_ws
        )
    ),
})
