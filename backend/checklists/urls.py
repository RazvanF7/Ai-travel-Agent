from django.urls import path
from . import views

urlpatterns = [
    path('<int:trip_id>/', views.ChecklistListCreateView.as_view(), name='checklist-list-create'),
    path('<int:trip_id>/<int:item_id>/toggle/', views.ChecklistToggleView.as_view(), name='checklist-toggle'),
    path('<int:trip_id>/<int:item_id>/delete/', views.ChecklistDeleteView.as_view(), name='checklist-delete'),
]
