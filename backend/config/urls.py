from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/groups/', include('groups.urls')),
    path('api/trips/', include('trips.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/checklists/', include('checklists.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/ai/', include('ai_agents.urls')),
    path('api/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
