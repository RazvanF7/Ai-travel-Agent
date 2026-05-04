from django.urls import path
from . import views

urlpatterns = [
    path('trips/<int:trip_id>/expenses/', views.ExpenseListView.as_view(), name='expense-list'),
    path('expenses/create/', views.create_expense, name='expense-create'),
    path('debts/<int:trip_id>/summary/', views.debt_summary, name='debt-summary'),
    path('debts/<int:split_id>/pay/', views.mark_debt_paid, name='debt-pay'),
    path('upload/receipt/', views.upload_receipt_url, name='upload-receipt'),
]
