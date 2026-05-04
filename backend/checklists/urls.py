from django.urls import path
from . import views

urlpatterns = [
    path('<int:trip_id>/', views.ChecklistListCreateView.as_view(), name='checklist-list-create'),
]
