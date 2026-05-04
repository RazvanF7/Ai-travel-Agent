from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/checklist/(?P<trip_id>\d+)/$', consumers.ChecklistConsumer.as_asgi()),
]
