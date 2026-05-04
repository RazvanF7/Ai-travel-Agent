from django.urls import path
from . import views

urlpatterns = [
    path('', views.GroupListCreateView.as_view(), name='group-list-create'),
    path('<int:pk>/', views.GroupDetailView.as_view(), name='group-detail'),
    path('join/', views.join_group, name='group-join'),
]
