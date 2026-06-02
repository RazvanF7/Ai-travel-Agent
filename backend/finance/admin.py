from django.contrib import admin
from .models import Transaction, DebtSplit

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['payer', 'amount', 'currency', 'description', 'trip', 'created_at']
    list_filter = ['currency', 'trip']

@admin.register(DebtSplit)
class DebtSplitAdmin(admin.ModelAdmin):
    list_display = ['debtor', 'amount', 'status', 'transaction']
    list_filter = ['status']
