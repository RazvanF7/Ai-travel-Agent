from django.db import models
from django.contrib.auth.models import User
from trips.models import Trip


class Transaction(models.Model):
    """An expense logged by a group member (US-009)."""
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='transactions')
    payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='paid_transactions')
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Never use FloatField for money'
    )
    currency = models.CharField(max_length=3, default='EUR', help_text='ISO 4217')
    description = models.CharField(max_length=255)
    receipt_url = models.URLField(blank=True, default='', help_text='URL to receipt image (US-012)')
    split_type = models.CharField(
        max_length=10,
        choices=[('equal', 'Equal'), ('custom', 'Custom')],
        default='equal'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.payer.username} paid {self.amount} {self.currency} — {self.description}'


class DebtSplit(models.Model):
    """How an expense is split among group members (US-009, US-010)."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='splits')
    debtor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='debts')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('transaction', 'debtor')

    def __str__(self):
        return f'{self.debtor.username} owes {self.amount} ({self.status})'
