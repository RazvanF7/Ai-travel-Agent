from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/ai/(?P<group_id>\d+)/$', consumers.AIStreamConsumer.as_asgi()),
]
